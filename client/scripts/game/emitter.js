'use strict';

define([
  'lib/pixi',
  'game/actor'

], function (pixi, Actor) {

  var Emitter = function() {
    Actor.call(this);

    this.particles = [];
    this.maxCount = 100;
    this.emission = 10;
    this.particleLife = 1.0;
    this.count = 0;

    try {
    for (var i = 0; i < this.maxCount; i++) {
      var p = new pixi.Sprite.fromImage('assets/particle.png');
      p.width = 2;
      p.height = 2;
      p.velocity = new pixi.Point(Math.random() * 10 - 5, Math.random() * 10 - 5);
      this.particles.push(p);
      //this.addChild(p);
    }
    }
    catch (e) {
      console.log(e);
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
      this.addChild(p);
      p.life = this.particleLife;
      p.velocity.set(-200, 200.0);
      p.position.set(0.0, 0.0);
    }

    this.count = this.count + toEmitCount;
    var prevCount = this.count;
    for (var i = 0; i < this.count; i++) {
      var p = this.particles[i];
      p.life -= dt;
      p.position.set(p.position.x + dt * p.velocity.x,
                     p.position.y + dt * p.velocity.y);

      if (p.life <= 0.0) {
        // this.swapChildren(i, this.count - 1);
        var temp = this.children[i];
        this.children[i] = this.children[this.count - 1];
        this.children[this.count - 1] = temp;

        temp = this.particles[i];
        this.particles[i] = this.particles[this.count - 1];
        this.particles[this.count - 1] = temp;
        i--;
        this.count--;
      }

    }
    // this.removeChildren(this.count);
  }

  return Emitter;
});