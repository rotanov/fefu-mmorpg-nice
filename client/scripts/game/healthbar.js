define([
  'lib/pixi',
  'game/actor'
], function (pixi, Actor) {
  var HealthBar = function() {
    Actor.call(this);

    var barBorder = new pixi.Graphics();
    this.addChild(barBorder);
    barBorder.beginFill(0xEEEEEE, 1.0);
    barBorder.drawRect(-2, -2, 128 + 4, 16 + 4);
    barBorder.endFill();

    var bar = new pixi.Graphics();
    this.addChild(bar);

    bar.beginFill(0xFF0000, 1.0);
    bar.drawRect(0, 0, 128, 16);
    bar.endFill();

    var text = new pixi.Text('', {font: 'bold 14px Consolas'});
    this.addChild(text);

    text.position.set(4, 2);

    this.text = text;
    this.bar = bar;

    this.t = 0.0;
  }

  HealthBar.prototype = Object.create(Actor.prototype);
  HealthBar.prototype.constructor = HealthBar;

  HealthBar.prototype.setHealth = function (health, maxHealth) {
    this.bar.scale.set(health / maxHealth, 1.0);
    this.text.setText(health + '/' + maxHealth);
  }

  HealthBar.prototype.update = function(dt) {
    this.t += 2 * dt;
    this.text.position.set(4, 2.0 * Math.sin(this.t));
  }

  return HealthBar;
});