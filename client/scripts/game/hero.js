define([
  'lib/pixi',
  'game/actor'
], function (pixi, Actor) {
  var Hero = function() {
    Actor.call(this);

    var base = new pixi.Graphics();
    this.addChild(base);
    var tail = new pixi.Graphics();
    this.addChild(tail);

    // base.lineStyle(10, 0xFF0000, 0.5);
    base.beginFill(0xAAFF11, 0.5);
    base.drawRect(-10, -10, 20, 20);
    base.endFill();

    tail.beginFill(0xFF0000, 0xFF);
    tail.drawRect(-2, -2, 4, 4);
    tail.position.set(4, -4);
    tail.endFill();
  }

  Hero.prototype = Object.create(Actor.prototype);
  Hero.prototype.constructor = Hero;

  return Hero;
});