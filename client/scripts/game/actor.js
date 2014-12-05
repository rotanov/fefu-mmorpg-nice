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

  }

  Actor.prototype.animate = function (keys, time) {
    for (var k in keys) {
      var v = keys[k];
      if (v.length === undefined
        || v.length === 1) {
        keys[k] = [];
        keys[k].push(this[k]);
        keys[j].push(v);
      }
    }

    return new Promise(function (resolve, reject) {
      this.animators.push({
        resolve: resolve,
        reject: reject,
        keys: keys,
        time: time,
        update: function (dt) {
          for (var k in keys) {
            this[k]
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