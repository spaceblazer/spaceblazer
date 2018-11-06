class Device < ApplicationRecord
  validates :external_id, presence: true, uniqueness: true
  validates :online, presence: true

  def send_game_info
    game_json = Game.current.to_json(include: :players)
    DevicesChannel.broadcast_to(self, game_json)
  end

  def self.broadcast_to_all(data)
    Device.where(online: true).each do |device|
      DevicesChannel.broadcast_to(device, data)
    end
  end
end
