'use strict';

define([
  'lib/pixi',
  'game/actor',
  'game/emitter'
], function (pixi, Actor, Emitter) {

  function drawBody(base, tail, color, heroClass) {
    // base.lineStyle(10, 0xFF0000, 0.5);
    base.clear();
    base.beginFill(color, 1.0);
    switch (heroClass) {
      case 'warrior':
        base.drawRect(-10, -10, 20, 20);
        break;

      case 'mage':
        base.drawCircle(0, 0, 10);
        break;

      case 'rogue':
        base.drawPolygon(-10, -10, 10, -10, 0, 10);
        break;

      case 'item':
        base.drawCircle(-5, -5, 10, 10);
        break;

      default:
        base.drawPolygon(-10, -10, 10, -10, 0, 10);
        base.drawPolygon(-10, 10, 10, 10, 0, -10);
        break;
    }
    base.endFill();

    tail.clear();
    if (heroClass != 'item') {
      tail.beginFill(0x000000, 1.0);
      tail.drawRect(-2, -2, 4, 4);
      tail.position.set(4, -4);
      tail.endFill();
    }
  }

  var Hero = function(heroClass) {
    Actor.call(this);

    this.heroClass = heroClass;

    var base = new pixi.Graphics();
    this.addChild(base);
    var tail = new pixi.Graphics();
    this.addChild(tail);

    drawBody(base, tail, 0xFFFFFF);

    this.drawBody = function(color) {
      drawBody(base, tail, color, this.heroClass);
    }

    this.phase = Math.random() * Math.PI * 2;
  }

  Hero.prototype = Object.create(Actor.prototype);
  Hero.prototype.constructor = Hero;

  Hero.prototype.update = function (dt) {
    this.phase += 10.0 * dt;
    var t = this.phase;
    var scale = 1.5 + Math.sin(t) * 0.1;
    if (this.heroClass !== 'item') {
      this.scale.set(scale, scale);
    }
  }

  Hero.prototype.setColor = function (color, heroClass) {
    this.heroClass = heroClass;
    this.drawBody(color);
  }

  return Hero;
});