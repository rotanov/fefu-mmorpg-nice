'use strict';

require([
  'minified',
  'lib/mocha',
  'game/api',
  'lib/bluebird',

], function (mini, m, api, Promise) {
  var $ = mini.$;

  function test(testsuit) {
    return new Promise(function (resolve, reject) {
      require(['test/' + testsuit], function () {
        resolve();
      })
    });
  }

  mocha.setup({
    ui: 'bdd',
    asyncOnly: true
  });

  var ready = false;

  Promise.join(
    test('register'),
    test('websocket'),
    test('items'),
    test('mobs'),
    test('players'),
    test('projectile'),
    function() {
      mocha.checkLeaks();
      ready = true;
      mocha.run();
  });

  $('#run-tests').onClick(function () {
    if (ready) {
      $('#mocha').fill();
      mocha.run();
    }
  });

});
