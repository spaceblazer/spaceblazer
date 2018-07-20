import * as PIXI from 'pixi.js';
import { keyboard, redisEvent } from './keyboard.js';

// The application will create a renderer using WebGL, if possible,
// with a fallback to a canvas render. It will also setup the ticker
// and the root stage PIXI.Container
const app = new PIXI.Application();

const speed = 5;
const bulletSpeed = 5;

// The application will create a canvas element for you that you
// can then insert into the DOM
document.body.appendChild(app.view);

import bunnyImg from './assets/images/einstein.png';
import rainbowBall from './assets/images/rainbowball.png';

let leftKey  = keyboard(37);
let upKey    = keyboard(38);
let rightKey = keyboard(39);
let downKey  = keyboard(40);
let spaceKey = keyboard(32);
let bButton = redisEvent('b');

// load the texture we need
PIXI.loader.add('bunny', bunnyImg).add('ball', rainbowBall).load((loader, resources) => {
    // This creates a texture from a 'bunny.png' image
    const bunny = new PIXI.Sprite(resources.bunny.texture);
    const bullets = [];
    // Setup the position of the bunny
    bunny.x = app.renderer.width / 2;
    bunny.y = app.renderer.height / 2;

    bunny.anchor.x = 0.5
    bunny.anchor.y = 0.5

    rightKey.press = () => bunny.x = bunny.x + speed;
    downKey.press  = () => bunny.y = bunny.y + speed;
    leftKey.press  = () => bunny.x = bunny.x - speed;
    upKey.press    = () => bunny.y = bunny.y - speed;
    spaceKey.press = () => {
      var ball = new PIXI.Sprite(resources.ball.texture);
      ball.x = bunny.x;
      ball.y = bunny.y;
      app.stage.addChild(ball);
      bullets.push(ball);
    }

    bButton.press = () => {
      var ball = new PIXI.Sprite(resources.ball.texture);
      ball.x = bunny.x;
      ball.y = bunny.y;
      app.stage.addChild(ball);
      bullets.push(ball);
    }

    // Add the bunny to the scene we are building
    app.stage.addChild(bunny);

    // Listen for frame updates
    app.ticker.add(() => {
      bullets.forEach(function(bullet, index) {
        console.log('updating bullet');
        bullet.x += bulletSpeed;

        if (bullet.x > app.renderer.width) {
          delete bullets[index]; 
        };
      });
    });
});
