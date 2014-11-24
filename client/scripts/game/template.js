'use strict';

define([
  'lib/pixi',
  'game/Actor'

], function (pixi, Actor) {
  var Template = function() {
    Actor.call(this);
  }

  Template.prototype = Object.create(Actor.prototype);
  Template.prototype.constructor = Template;

  return Template;
});