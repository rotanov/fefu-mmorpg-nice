'use strict';

define([
  'lib/pixi',
  'game/actor',
  'game/emitter'
], function (pixi, Actor, Emitter) {

  function drawBody(base, tail, color) {
    // base.lineStyle(10, 0xFF0000, 0.5);
    base.clear();
    base.beginFill(color, 0.7);
    base.drawRect(-10, -10, 20, 20);
    base.endFill();

    tail.clear();
    tail.beginFill(0x000000, 0xFF);
    tail.drawRect(-2, -2, 4, 4);
    tail.position.set(4, -4);
    tail.endFill();
  }

  var Hero = function() {
    Actor.call(this);

    var base = new pixi.Graphics();
    this.addChild(base);
    var tail = new pixi.Graphics();
    this.addChild(tail);

    drawBody(base, tail, 0xFFFFFF);

    this.drawBody = function(color) {
      drawBody(base, tail, color);
    }

    this.phase = Math.random() * Math.PI * 2;
  }

  Hero.prototype = Object.create(Actor.prototype);
  Hero.prototype.constructor = Hero;

  Hero.prototype.update = function (dt) {
    this.phase += 10.0 * dt;
    var t = this.phase;
    var scale = 1.5 + Math.sin(t) * 0.1;
    this.scale.set(scale, scale);
  }

  Hero.prototype.setColor = function (color) {
    this.drawBody(color);
  }

  return Hero;
});