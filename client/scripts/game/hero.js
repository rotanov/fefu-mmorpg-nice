'use strict';

define([
  'lib/pixi',
  'game/actor',
  'game/emitter'
], function (pixi, Actor, Emitter) {

  function drawBody(hero, color, heroClass) {
    var base = hero.base;
    var tail = hero.tail;
    var hud = hero.hud;
    base.clear();

    // base.lineStyle(1, 0x000000, 1.0);
    // base.drawRect(-16, -16, 32, 32);

    hud.clear();
    if (heroClass !== 'item') {
      hud.lineStyle(2, 0x000000, 1.0);
      hud.drawRect(-32, -32, 64, 6);
      hud.lineStyle(2, 0xfd7400, 1.0);
      hud.drawRect(-30, -30, 60 * hero.health / hero.maxHealth, 2);
    }

    hud.lineStyle(1, 0xff0000, 1.0);
    var size = hero.boxSize * 64;
    hud.drawRect(-size * 0.5, -size * 0.5, size, size);

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
        hero.body.rotation = 0;
        hero.body.scale.set(1, 1);
        base.drawCircle(0, 0, 8, 8);
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
    if (heroClass !== 'item') {
      tail.beginFill(0x000000, 1.0);
      tail.drawRect(-2, -2, 4, 4);
      tail.position.set(4, -4);
      tail.endFill();
    }
  }

  var Hero = function(heroClass) {
    Actor.call(this);

    this.heroClass = heroClass;
    this.health = 100;
    this.maxHealth = 100;
    this.targetAngle = 0;
    this.boxSize = 1.0;

    // var attackBody = new pixi.Graphics();
    // this.attackBody = attackBody;
    // this.addChild(attackBody);

    // attackBody.beginFill();
    // attackBody.drawRect(-20, -20, 40, 40);
    // attackBody.endFill();

    var body = new pixi.Graphics();
    this.addChild(body);

    var base = new pixi.Graphics();
    body.addChild(base);
    var tail = new pixi.Graphics();
    body.addChild(tail);

    var hud = new pixi.Graphics();
    this.addChild(hud);
    this.hud = hud;

    this.body = body;
    this.base = base;
    this.tail = tail;

    drawBody(this, 0xFFFFFF);

    this.drawBody = function(color) {
      drawBody(this, color, this.heroClass);
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
      this.body.scale.set(scale, scale);

      var angleDelta = this.targetAngle - this.body.rotation;
      if (angleDelta > Math.PI) {
        angleDelta = -Math.PI * 2 + angleDelta;
      }
      this.body.rotation += angleDelta * dt * 10;
    }
  }

  Hero.prototype.setColor = function (color, heroClass) {
    this.heroClass = heroClass;
    this.drawBody(color);
  }

  Hero.prototype.setHealth = function (health, maxHealth) {
    this.health = health;
    this.maxHealth = maxHealth;
  }

  Hero.prototype.setHeroDeltas = function (dx, dy) {
    if (dx * dy != 0.0) {
      var l = Math.sqrt(dx*dx + dy*dy);
      dx /= l;
      dy /= l;
      this.lastDir = new pixi.Point(dx, dy);
    }

    if (dx != 0 || dy != 0) {
      this.targetAngle = Math.PI / 4 + Math.atan2(dy, dx);
    }
  }

  Hero.prototype.bleedFor = function (damage) {
    var blood = new Emitter({
      angleSpread: Math.PI * 2,
      texture: 'particle-blood',
      velocityBase: 100,
      life: 0.1,
      size: 16,
      particleLife: 0.1
    });
    this.body.addChild(blood);

    // var text = new pixi.Text('', {font: 'bold 14px Consolas', fill: '#ffffff'});
    // text.setText('-' + damage);
    // text.position.set(-16, -64);
    // this.addChild(text);
  }

  Hero.prototype.attack = function () {
    return this.animate.call(this.attackBody, {position: new pixi.Point(0, 0)}, 500);
  }

  Hero.prototype.setBoxSize = function (boxSize) {
    this.boxSize = boxSize;
  }

  return Hero;
});