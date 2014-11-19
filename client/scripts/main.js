require([
  'lib/jquery',
  'game/api',
  'game/game',
  'test/tester'

], function ($, api, game, test) {

  function onLogin(data) {
    if (data.result === 'ok') {
      $('#server-answer').text('Authentication is successful.').css('color', 'green');
      $('#content, #test-form').hide();
      $('#logout, #items, #items select').show();

      game.start(data);

    } else if (data.result === 'invalidCredentials') {
      $('#password').val('');
      $('#server-answer').text('Invalid login or password.').css('color', 'red');
    }
  }

  $('#register').click(function () {
    $('#server-answer').empty();
    api.register($('#username').val(), $('#password').val(),
      $('#player-classes').find(':selected').text())
    .then(function (data) {
      var serverAnswer = $('#server-answer');
      if (data === null) {
        serverAnswer.text('Data is null, request might be failed.').css('color', 'red');
      }

      switch (data.result) {
      case 'ok':
        api.login($('#username').val(), $('#password').val())
        .then(onLogin);
        break;

      case 'loginExists':
        $('#username, #password').val('');
        serverAnswer.text('This login already exists.').css('color', 'red');
        break;

      case 'badLogin':
        $('#username, #password').val('');
        serverAnswer.text('Login: minimal length is 2 symbols and '
      + 'maximum length is 36 symbols. Allowed charset is '
      + 'latin symbols and numbers.').css('color', 'red');
        break;

      case 'badPassword':
        $('#username, #password').val('');
        serverAnswer.text('Password: minimal length is 6 symbols and '
      + 'maximum length is 36 symbols.').css('color', 'red');
        break;

      case 'badClass':
        $('#username, #password').val('');
        serverAnswer.text('Class: one of the following options: '
      + 'warrior, rogue, mage.').css('color', 'red');
        break;

      }
    });
  });

  $('#login').click(function (data) {
    $('#server-answer').empty();
    api.login($('#username').val(), $('#password').val())
    .then(onLogin);
  });

  $('#logout').click(function () {
    $('#server-answer').empty();
    api.logout()
    .then(function (data) {
      if (data.result === 'ok') {
        $('#server-answer').text('Logged out').css('color', 'green');
        $('#logout').css('visibility', 'hidden');
        location.href = api.getServerAddress();

      } else if (data.result === 'badSid') {
        $('#server-answer').text('Invalid session ID.').css('color', 'red');
      }
    });
  });

  $('#test').click(function () {
    $('#content, #test-form').hide();
    test.runTestset($('#tests').find(':selected').text());
  });

  $(document).ready(function () {

    $('#server-address').change(function () {
      api.setServerAddress($('#server-address').val());
    });

    $('#login').focus();

    var serverAddress = location.origin;
    if (location.protocol === 'file:') {
      serverAddress = 'http://localhost:6543';
    }
    $('#server-address').attr('value', serverAddress);
    api.setServerAddress(serverAddress);
  });

  window.onbeforeunload = function () {
    api.logout();
  };
});
