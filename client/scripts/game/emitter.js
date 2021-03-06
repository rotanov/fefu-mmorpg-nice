'use strict';

define([
  'lib/pixi',
  'game/actor'

], function (pixi, Actor) {

  var fxLayer_;

  var Emitter = function(options) {
    Actor.call(this);
    options = options || {};
    this.particles = [];
    this.maxCount = options.maxCount || 1000;
    this.emission = options.emission || 100;
    this.particleLife = options.particleLife || 1.2;
    this.particleLifeSpread = options.particleLifeSpread || 0.05;
    this.particleSize = options.size || 4;
    this.alphaBegin = options.alphaBegin || 1.0;
    this.alphaEnd = options.alphaEnd || 0.0;
    this.angle = options.angle || Math.atan2(1, -1);
    this.angleSpread = options.angleSpread || Math.PI;
    this.emitterposition = options.position || new pixi.Point(0, 0);
    this.texture = options.texture || 'particle-trail';
    this.fxLayer = options.layer || fxLayer_;
    this.velocityBase = options.velocityBase || 20;
    this.life = options.life || -1;

    this.position = this.emitterposition;

    this.count = 0;

    for (var i = 0; i < this.maxCount; i++) {
      var p = new pixi.Sprite.fromImage('assets/' + this.texture + '.png');
      p.width = this.particleSize;
      p.height = this.particleSize;
      p.alpha = this.alphaBegin;
      p.velocityScalar = this.velocityBase;
      p.velocity = new pixi.Point();
      this.particles.push(p);
    }

    this.prevFrameLeft = 0;
  }

  Emitter.prototype = Object.create(Actor.prototype);
  Emitter.prototype.constructor = Emitter;

  Emitter.prototype.update = function (dt) {
    for (var i = 0; i < this.count; i++) {
      var p = this.particles[i];
      p.alpha = p.life / this.particleLife;
      p.life -= dt;
      p.position.set(p.position.x + dt * p.velocity.x * p.velocityScalar,
                     p.position.y + dt * p.velocity.y * p.velocityScalar);

      if (p.life <= 0.0) {
        var temp = this.fxLayer.children[i];
        this.fxLayer.children[i] = this.fxLayer.children[this.count - 1];
        this.fxLayer.children[this.count - 1] = temp;

        temp = this.particles[i];
        this.particles[i] = this.particles[this.count - 1];
        this.particles[this.count - 1] = temp;
        i--;
        this.count--;
      }

    }

    if (this.life !== -1) {
      this.life -= dt;
      if (this.life <= 0.0) {
        if (this.count === 0) {
          for (var i = 0; i < this.particles.length; i++) {
            this.fxLayer.removeChild(this.particles[i]);
          }
          this.kill();
        }
        return;
      }
    }

    var totalToEmit = this.prevFrameLeft + this.emission * dt;
    var toEmitCount = Math.trunc(Math.min(totalToEmit, this.maxCount - this.count));
    this.prevFrameLeft = totalToEmit - toEmitCount;

    for (var i = this.count; i < toEmitCount + this.count; i++) {
      var p = this.particles[i];
      this.fxLayer.addChild(p);
      p.life = this.particleLife + Math.random() * this.particleLifeSpread * 0.5 - this.particleLifeSpread * 0.25;
      var globalZero = this.toGlobal(this.emitterposition);
      var resultAngle = this.angle + (Math.random() - 0.5) * this.angleSpread;
      var vDir = new pixi.Point(Math.cos(resultAngle), Math.sin(resultAngle));
      var globalVDest = this.toGlobal(vDir);
      p.velocity.set(globalVDest.x - globalZero.x, globalVDest.y - globalZero.y);
      // p.position = globalZero;
      // SUDDEN PERFORMANCE DEGRADATION
      // I HAVE NO IDEA WHY THOUGH
      p.position = this.fxLayer.toLocal(globalZero);
    }

    var prevCount = this.count;
    this.count = this.count + toEmitCount;
    // this.fxLayer.removeChildren(this.count);
  }

  Emitter.setFxLayer = function(fxLayer) {
    fxLayer_ = fxLayer;
  }

  return Emitter;
});