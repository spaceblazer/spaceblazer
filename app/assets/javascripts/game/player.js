class Player {
  constructor(id, avatar, game_id, scene) {
    this.scene = scene;
    this.id = id;
    this.avatarName = avatar;
    this.game_id = game_id;
    this.spawn = Player.getSpawnPoint();
    this.bullets = [];
    this.rotation = 0;
    this.speed = spaceblazerConfig("default_player_speed");
    this.shape = this.scene.shapes['astro_blue1'];
    this.firstFrame = Player.firstFrameName(this.avatarName);
    this.level = 2;
    this.maximum_level = 7;

    this.sprite = this.scene.matter.add.sprite(
      this.spawn.x,
      this.spawn.y,
      'multipass',
      this.firstFrame,
      { shape: this.shape }
    );

    this.sprite.play(this.avatarName);
    this.sprite.wrapper = this;
    this.sprite.setIgnoreGravity(true);
    this.sprite.setFriction(0, 0, 0);
    this.sprite.setCollisionCategory(Player.collisionCategory);
    this.sprite.setFixedRotation(0);

    this.bulletType = 'rainbow_bomb';
    this.bulletOffset = { x: 50, y: 20 };

    this.score = 0;
    this.scoreText = scene.add.text(this.scoreX(), this.scoreY(), ("Score: " + this.score + "\nLevel: " + this.level), { fontSize: '18px', fill: '#fff' });

    Player.activePlayers[this.id] = this;

    scene.sfx.play('newplayer');

    debugLog("New player in scene " + scene.name + ' with ID ' + this.id);
  };

  static init() {
    Player.activePlayers = {};
    Player.allPlayers = [];
    Player.allBullets = [];
    Player.spawnOffset = { x: 10, y: 10 };

    Player.scores = {
      destroy_enemy: 50,
      destroy_bullet: 20,
      touch_enemy: -40,
      touch_bullet: -50,
      level_up: 30
    }
  }

  static width() {
    return 212;
  };

  static height() {
    return 125;
  };

  static getSpawnPoint() {
    let spawnX = Player.spawnOffset.x + (Player.width() / 2);
    let spawnY = Player.spawnOffset.y + (Player.height() / 2);
    let spawnPoint = { x: spawnX, y: spawnY };

    debugLog('Player spawn: ' + JSON.stringify(spawnPoint));

    if (screen.height > (spawnPoint.y + (Player.height() * 2) + 50)) {
      Player.spawnOffset.y += (Player.height() + 10);
    }
    else if (screen.availWidth > (spawnPoint.x + Player.width() + 10)) {
      Player.spawnOffset.x += (Player.width() + 10);
      Player.spawnOffset.y = 10;
    }
    else {
      Player.spawnOffset = { x: 10, y: 10 };
    }

    return spawnPoint;
  };

  static load(currentScene) {
    Player.collisionCategory = currentScene.matter.world.nextCategory();

    let names = ['appy', 'blaze', 'cloudy', 'codey', 'earnie', 'hootie', 'koa', 'astro']
    names.forEach(function(name) {
      currentScene.load.animation(name, './animations/players/' + name + '.json');
    });
  };

  static create(data, currentScene) {
    let player = new Player(data["id"], data["avatar"], data["game_id"], currentScene);
    let enemy = new Enemy(Enemy.generateId(), currentScene);

    Player.allPlayers.push(player);
    Enemy.allEnemies.push(enemy);

    return player;
  };

  static addPlayers(players) {
    players.forEach(function(playerData) {
      let player = Player.create(playerData, game.mainScene);

      player.score = playerData["score"];
      player.level = playerData["level"];
      player.spawn = { x: playerData["spawn_x"], y: playerData["spawn_y"] };
    });
  }

  static update() {
    Object.values(Player.activePlayers).forEach(function(player) {
      player.update();
    });
  };

  static firstFrameName(avatarName) {
    return ("players/" + avatarName.replace("_", "/") + "/" + avatarName + "1");
  }

  static roomForMorePlayers() {
    return (Player.allPlayers.length < game.mainScene.NUM_PLAYERS);
  }

  displayName() {
    let split = this.avatarName.split('_');
    let character = split[0].charAt(0).toUpperCase() + split[0].slice(1);
    let color = split[1].charAt(0).toUpperCase() + split[1].slice(1);
    return (color + " " + character);
  }

  levelUp() {
    if (this.level < this.maximum_level) {
      this.scoreEvent("level_up");
      this.level += 1;
      this.updateText();
    }
  }

  scoreX() {
    //left side of sprite
    return this.sprite.x - (this.sprite.width * this.sprite.originX) - 40;
  }

  scoreY() {
    // just above center vertically
    return this.sprite.y - (this.sprite.height * .1) - 40;
  }

  mayday() {
    this.rotation = 1;
    this.decrementScore();
  }

  checkMayday() {
    if (this.rotation >= 6) {
      this.rotation = 0;
      this.sprite.setRotation(this.rotation);
    }
    else if (this.rotation > 0) {
      this.sprite.setRotation(this.rotation);
      this.rotation += 1;
    }
  }

  moveScore() {
    this.scoreText.setPosition(this.scoreX(), this.scoreY());
  }

  update() {
    this.checkMayday();
    this.moveScore();
  }

  bounce() {
  }

  fire() {
    // return unless game started
    if (this.bullets.length > (0 + this.level)) {
      return;
    }

    let bullet = new Bullet(this);

    Player.allBullets.push(bullet);
    this.bullets.push(bullet);
  };

  collision(bodyA, bodyB) {
    if (bodyA.parent.gameObject && bodyB.parent.gameObject) {
      if (this.flickering) {
        return;
      }

      if (bodyB.parent.gameObject.wrapper instanceof Bullet) {
        bodyB.parent.gameObject.wrapper.explode();
        this.scoreEvent("touch_bullet");
        this.flicker();
      }
      else if (bodyB.parent.gameObject.wrapper instanceof Enemy) {
        this.scoreEvent("touch_enemy");
        this.flicker();
      }
      else if (bodyB.parent.gameObject.wrapper instanceof PowerUp) {
        bodyB.parent.gameObject.wrapper.get(this);
      }
    }
    else {
    }
  }

  flicker() {
    let flickerDuration = 1000;
    let flickerCount = 10;

    this.flickerTimer = this.scene.time.addEvent({
      delay: (flickerDuration / flickerCount),
      repeat: flickerCount,
      callback: function() {
        this.flickering = true;

        if (this.flickerTimer.getOverallProgress() < 1) {
          if (this.sprite.alpha >= 1) {
            this.sprite.setAlpha(0.5);
          }
          else {
            this.sprite.setAlpha(1);
          }
        }
        else {
          this.sprite.setAlpha(1);
          this.flickering = false;
        }
      },
      callbackScope: this
    });
  }

  scoreEvent(eventType) {
    if ((eventType == 'touch_enemy' || eventType == 'touch_bullet')) {
      if (this.level > 0) {
        this.level = this.level - 1;
      }
    }
    this.updateScore(Player.scores[eventType]);
  }

  updateText() {
    this.scoreText.setText("Score: " + this.score + "\nLevel: " + this.level);
  }

  updateScore(amount) {
    this.score = this.score + amount

    if (this.score < 0) {
      this.score = 0;
    }

    this.updateText();
  }

  static destroyAllSprites() {
    if (Player.allPlayers) {
      Player.allPlayers.forEach(function(player) {
        if (player.sprite) {
          player.sprite.destroy();
        }
      });
    }
  }
};
