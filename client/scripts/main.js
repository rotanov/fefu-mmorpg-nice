require([
  'minified',
  'game/api',
  'game/game',
  'test/tester'

], function (mini, audio, api, game) {
  var $ = mini.$;

  function onLogin(data) {
    if (data.result === 'ok') {
      // $('#server-answer').text('Authentication is successful.').css('color', 'green');
      // $('#content, #test-form').hide();
      // $('#logout, #items, #items select').show();

      game.start(data);

    } else if (data.result === 'invalidCredentials') {
      $('#password').val('');
      $('#server-answer').text('Invalid login or password.').css('color', 'red');
    }
  }

  $('#register').onClick(function () {
    //$('#server-answer').set('value', '');
    api.register($('#username').get('@value')
               , $('#password').get('@value')
               , $('option').filter(function (e, i) {
                  return e.selected && $(e).up($('#player-classes')).length > 0;
                }).get('@value'))
    .then(function (data) {
      var serverAnswer = $('#server-answer');
      if (data === null) {
        serverAnswer.text('Data is null, request might be failed.').css('color', 'red');
      }

      switch (data.result) {
      case 'ok':
        api.login($('#username').get('@value')
                , $('#password').get('@value'))
        .then(onLogin);
        break;

      case 'loginExists':
        serverAnswer.text('This login already exists.').css('color', 'red');
        break;

      case 'badLogin':
        serverAnswer.text('Login: minimal length is 2 symbols and '
      + 'maximum length is 36 symbols. Allowed charset is '
      + 'latin symbols and numbers.').css('color', 'red');
        break;

      case 'badPassword':
        serverAnswer.text('Password: minimal length is 6 symbols and '
      + 'maximum length is 36 symbols.').css('color', 'red');
        break;

      case 'badClass':
        serverAnswer.text('Class: one of the following options: '
      + 'warrior, rogue, mage.').css('color', 'red');
        break;

      }
    });
  });

  $('#login').onClick(function (data) {
    // $('#server-answer').empty();
    api.login($('#username').get('value')
            , $('#password').get('value'))
    .then(onLogin);
  });

  $('#logout').onClick(function (data) {
    // $('#server-answer').empty();
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

  $('#mute-volume').onClick(function () {
    audio.stop();
  })

  $(function () {
    $('#server-address').onChange(function () {
      api.setServerAddress($('#server-address').val());
    });

    audio.init();
    //audio.loadSoundFile('assets/526679_RR-Pac-Land-Theme.mp3');

    // $('#login').setFocus();

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
