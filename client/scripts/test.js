'use strict';

require([
  'minified',
  'lib/mocha',

  'test/register',
  'test/websocket',
  'test/items',
  'test/mobs',
  'test/players',
  'test/projectile'

], function (mini, m, tr, tw, ti, tm, tp, tpro) {
  var $ = mini.$;

  $('#run-tests').onClick(function () {
    var testsetName = $('option').find(function (e, i) {
      if (e.selected)
        {
          return $(e);
        }
    }).get('innerHTML');

    $('#mocha').fill();

    mocha.setup('bdd');

    ({'register': tr,
      'websocket': tw,
      'items': ti,
      'mobs': tm,
      'players': tp,
      'projectile': tpro
    })[testsetName].run();
  });

  $('#mute-volume').onClick(function () {
    audio.stop();
  })

  $(function () {

  });
});
