'use strict';

define([
  'lib/pixi'

], function (pixi) {
  var actors = [];

  var Actor = function() {
    pixi.DisplayObjectContainer.call(this);
    actors.push(this);
  }

  Actor.prototype = Object.create(pixi.DisplayObjectContainer.prototype);
  Actor.prototype.constructor = Actor;

  Actor.prototype.update = function (dt) {

  }

  Actor.getActors = function () {
    return actors;
  }

  return Actor;
});