'use strict';

define([
  'lib/pixi',
  'lib/bluebird'

], function (pixi, Promise) {
  var actors = [];
  var toKill = [];

  var Actor = function() {
    pixi.DisplayObjectContainer.call(this);
    actors.push(this);
    this.animators = []
  }

  Actor.prototype = Object.create(pixi.DisplayObjectContainer.prototype);
  Actor.prototype.constructor = Actor;

  Actor.prototype.update = function (dt) {
    for (var i = 0; i < this.animators.length; i++) {
      this.animators[i].update(this.animators[i], dt);
    }

  }

  Actor.prototype.animate = function (actor, keys, time) {
    for (var k in keys) {
      var v = keys[k];
      if (v.length === undefined
        || v.length === 1) {
        keys[k] = [];
        keys[k].push(actor[k]);
        keys[k].push(v);
      }
    }

    var animators = this.animators;

    return new Promise(function (resolve, reject) {
      animators.push({
        resolve: resolve,
        reject: reject,
        actor: actor,
        keys: keys,
        timeLimit: time,
        time: 0,
        update: function (animator, dt) {
          animator.time += dt;
          if (animator.time >= animator.timeLimit) {
            animators.splice(animators.indexOf(animator), 1);
            resolve();
          }
          var t = animator.time / animator.timeLimit;
          for (var k in keys) {
            actor[k].set((keys[k][1].x - keys[k][0].x) * t,
                         (keys[k][1].y - keys[k][0].y) * t);
          }
        }
      });
    });
  }

  Actor.prototype.kill = function() {
    toKill.push(this);
  }

  Actor.getActors = function () {
    return actors;
  }

  Actor.cleanUp = function () {
    for (var i = 0; i < toKill.length; i++) {
      var a = toKill[i];
      if (a.parent) {
        a.parent.removeChild(a);
      }
      // FIXME: ineffective
      actors.splice(actors.indexOf(a), 1);
    }
    toKill = [];
  }

  return Actor;
});