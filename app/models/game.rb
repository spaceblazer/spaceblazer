class Game < ApplicationRecord
  after_create :set_data
  has_many :players

  PLAYER_ANIMATION_FILES = Dir.glob("./app/assets/javascripts/game/animations/players/*.json")
  AVATARS = PLAYER_ANIMATION_FILES.map { |f| f.scan(/\/(\w+)\.json/) }.flatten

  def self.current
    Rails.logger.debug("Active games: " + Game.where(active: true).to_a.inspect)
    active_game = Game.where(active: true).first || Game.create(active: true)

    if active_game.players.count > 50
      Game.where(active: true).update_all(active: false)
      active_game = Game.create(active: true)
    end

    active_game
  end

  def set_data
    self.data = {}
    save
  end

  def start
    ActionCable.server.broadcast("commands", { id: "system", command: "start_game" }.to_json)
  end

  def stop
    ActionCable.server.broadcast("commands", { id: "system", command: "stop_game" }.to_json)
  end

  def random_avatar
    AVATARS.sample
  end

  def random_color
    COLORS.sample
  end

  def self.fetch_game(requester_id)
    game = Game.current

    player_info = game.players.map do |player|
      {
        id: player.client_side_id,
        avatar: player.avatar_slug,
        score: game.data.dig("players", player.client_side_id, "score") || 0,
        level: game.data.dig("players", player.client_side_id, "level") || 2,
        spawn_x: game.data.dig("players", player.client_side_id, "spawn_x") || 0,
        spawn_y: game.data.dig("players", player.client_side_id, "spawn_y") || 0,
        game_id: game.id
      }
    end

    message = {
      id: "system",
      game_info: {
        game_id: game.id,
        game_data: game.data,
        players: player_info,
        time_remaining: game.data["time_remaining"] || 60
      }
    }
    ActionCable.server.broadcast("commands", message.to_json)
  end

  def self.new_game
    old_game = Game.current
    old_game.active = false
    old_game.save

    Game.create(active: true)
  end

  def self.finish_game(data)
    game = Game.current
    game.update(data: data, active: false)

    message = {
      id: "system",
      game_finished: { game_id: game.id }
    }
    ActionCable.server.broadcast("commands-#{data['id']}", message.to_json)
  end

  def self.save_game(data)
    Game.current.update(data: data)
  end

  def self.add_player(player_id)
    self.current.add_player(player_id)
  end

  def new_player?(player_id)
    existing_ids = players.reload.map(&:client_side_id)

    if existing_ids.include? player_id
      Rails.logger.debug("Player ID already exists: #{player_id} (existing: #{existing_ids})")
      return false
    else
      Rails.logger.debug("Player ID is new: #{player_id} (existing: #{existing_ids})")
      return true
    end
  end

  def add_player(player_id)
    if new_player?(player_id)
      avatar = random_avatar
      color = random_color

      while self.players.where(avatar: avatar, color: color).any?
        avatar = random_avatar
        color = random_color
        break if players.length >=(AVATARS.length * COLORS.length)
      end

      players.create(avatar: avatar, color: color, client_side_id: player_id)
    else
      Player.where(client_side_id: player_id).each do |player|
        player.broadcast_create
      end
    end
  end

  def assigned_avatars
    players.map { |p| p.avatar }
  end

  def assigned_colors
    players.map { |p| p.color }
  end

  def self.get_colors
    JSON.parse(File.read(Game::PLAYER_ANIMATION_FILES.first))["anims"].map do |anim|
      anim["frames"]
    end.flatten.map do |f|
      f["frame"]
    end.map do |path|
      path.split("_").last[0..-2]
    end.uniq
  end
  COLORS = Game.get_colors
end
