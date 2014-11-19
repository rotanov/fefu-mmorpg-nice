define([
  'lib/pixi',
  'game/Actor'

], function (pixi, Actor) {
  var Template = function() {
    pixi.DisplayObjectContainer.call(this);
  }

  Template.prototype = Object.create(pixi.DisplayObjectContainer.prototype);
  Template.prototype.constructor = Template;

  return Template;
});