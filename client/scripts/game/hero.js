'use strict';

define([
  'lib/pixi',
  'game/actor',
  'game/emitter'
], function (pixi, Actor, Emitter) {

  function drawBody(base, tail, color, heroClass) {
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
        base.lineStyle(2, 0x000000, 1.0);
        base.beginFill(0xff0000, 1.0);
        base.drawCircle(0, 0, 14);
        base.beginFill(color, 1.0);
        base.drawRect(-17, -8, 10, 16);
        base.drawRect(7, -8, 10, 16);
        base.endFill();

        for (var i = 0; i < 4; i++) {
          base.moveTo(-17, -4 + i * 4);
          base.lineTo(-7, -4 + i * 4)
        }
        for (var i = 0; i < 4; i++) {
          base.moveTo(7, -4 + i * 4);
          base.lineTo(17, -4 + i * 4)
        }

        tail.clear();
        tail.beginFill(0x550000, 1.0);
        tail.drawCircle(0, 0, 10);
        tail.position.set(0, 0);
        tail.endFill();
        return;
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