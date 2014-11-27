'use strict';

define([
  'lib/pixi',
  'game/actor'

], function (pixi, Actor) {

  var fxLayer_;

  var Emitter = function() {
    Actor.call(this);

    this.particles = [];
    this.maxCount = 100;
    this.emission = 10;
    this.particleLife = 1.2;
    this.particleLifeSpread = 0.05;
    this.count = 0;

    for (var i = 0; i < this.maxCount; i++) {
      var p = new pixi.Sprite.fromImage('assets/particle.png');
      p.width = 2;
      p.height = 2;
      p.velocity = new pixi.Point(Math.random() * 10 - 5, Math.random() * 10 - 5);
      this.particles.push(p);
    }

    this.prevFrameLeft = 0;
  }

  Emitter.prototype = Object.create(Actor.prototype);
  Emitter.prototype.constructor = Emitter;

  Emitter.prototype.update = function (dt) {
    var totalToEmit = this.prevFrameLeft + this.emission * dt;
    var toEmitCount = Math.trunc(Math.min(totalToEmit, this.maxCount - this.count));
    this.prevFrameLeft = totalToEmit - toEmitCount;

    for (var i = this.count; i < toEmitCount + this.count; i++) {
      var p = this.particles[i];
      fxLayer_.addChild(p);
      p.life = this.particleLife + Math.random() * this.particleLifeSpread * 0.5 - this.particleLifeSpread * 0.25;
      var globalZero = this.toGlobal(new pixi.Point(0, 0));
      var angle = Math.atan2(-1, 1);
      var angleDev = Math.PI / 6;
      var resultAngle = angle + Math.random() * angleDev * 0.5 - angleDev * 0.25;
      var vDir = new pixi.Point(Math.cos(resultAngle) * 20, Math.sin(resultAngle) * 20);
      var globalVDest = this.toGlobal(vDir);
      p.velocity.set(globalVDest.x - globalZero.x, globalVDest.y - globalZero.y);
      p.position = globalZero;
      // SUDDEN PERFORMANCE DEGRADATION
      // I HAVE NO IDEA WHY THOUGH
      // p.position = fxLayer_.toLocal(globalZero);
    }

    this.count = this.count + toEmitCount;
    var prevCount = this.count;
    for (var i = 0; i < this.count; i++) {
      var p = this.particles[i];
      p.life -= dt;
      p.position.set(p.position.x + dt * p.velocity.x,
                     p.position.y + dt * p.velocity.y);

      if (p.life <= 0.0) {
        var temp = fxLayer_.children[i];
        fxLayer_.children[i] = fxLayer_.children[this.count - 1];
        fxLayer_.children[this.count - 1] = temp;

        temp = this.particles[i];
        this.particles[i] = this.particles[this.count - 1];
        this.particles[this.count - 1] = temp;
        i--;
        this.count--;
      }

    }
    // this.removeChildren(this.count);
  }

  Emitter.setFxLayer = function(fxLayer) {
    fxLayer_ = fxLayer;
  }

  return Emitter;
});