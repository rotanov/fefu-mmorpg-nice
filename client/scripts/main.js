require([
  'lib/jquery',
  'game/api',
  'game/game',
  'test/tester'

], function ($, api, game, test) {

  $('#register').click(function () {
    auth.jsonHandle('register', auth.registerCallback);
  });

  $('#login').click(function () {
    auth.jsonHandle('login', auth.loginCallback);
  });

  $('#logout').click(function () {
    auth.jsonHandle('logout', auth.logoutCallback);
  });

  $('#test').click(function () {
    $('#content, #test-form').hide();
    test.runTestset($('#tests').find(':selected').text());
  });

  $(document).ready(function () {

    $('#server-address').change(function () {
      utils.setServerAddress($('#server-address').val());
    });

    var serverAddress = location.origin;
    if (location.protocol === 'file:') {
      serverAddress = 'http://localhost:6543';
    }
    $('#server-address').attr('value', serverAddress);
    utils.setServerAddress(serverAddress);
  });

  window.onbeforeunload = function () {
    auth.jsonHandle('logout', auth.logoutCallback);
  };
});
