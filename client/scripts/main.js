'use strict';

require([
  'minified',
  'audio',
  'game/api',
  'game/game',
  'lib/bluebird'

], function (mini, audio, api, game, Promise) {
  var $ = mini.$;
  var $$ = mini.$$;
  var EE = mini.EE;

  var rpgMsg = function (text) {
    var p = EE('p', {$overflow: 'hidden', '$white-space': 'nowrap'}, text);
    $('#message').add(p);
    $('#message').animate({scrollTop: $$('#message').scrollHeight}, 400);
    $(p).set({$width: '0px'})
    .animate({$width: '100%'}, 400);
  }

  function toggleGameScreen() {
    return new Promise(function (resolve, reject) {
      var height = 'calc(100vh - 141px - 20px - 1.5em - 5px)'
      var time = 400;
      Promise.join(
        $('#left-panel').animate({$height: height}, time),
        $('#right-panel').animate({$height: height}, time),
        $('#game-screen').animate({$height: height}, time),
        function () {
          resolve();
        }
      );
    });
  }

  function login() {
    return api.login($$('#username').value
                   , $$('#password').value)
    .then(function (data) {
      rpgMsg('Signed in.');

      game.start(data)
      .then(function (view) {
        $('#game-screen').add(view);
        $(view).set({$height: '0vh', $display: 'block', $width: '100%'});

        $('#login-form').animate({$$slide: 0}, 400)
        .then(toggleGameScreen)
        .then(function () {
          $(view).animate({$height: '60vh'}, 200);
        });

        $('#sign-in').fill('Sign Out');
        window.addEventListener('resize', function () {
          // renderer.view.style.width = $('#game-screen').get('$width');
          $('#message').set({scrollTop: $$('#message').scrollHeight});
        });
      });
    })
    .catch(function (data) {
      rpgMsg("Invalid login or password.");
    });
  }

  $('#register').onClick(function () {
    api.register($$('#username').value
               , $$('#password').value
               , $('option').filter(function (e, i) {
                  return e.selected && $(e).up($('#player-classes')).length > 0;
                }).get('@value'))
    .then(function (data) {
      login();
    })
    .catch(function (data) {
      var resultToText = {
        loginExists: 'This login already exists.',
        badLogin: 'Invalid Login: length must be 2 to 36 latin symbols or numbers.',
        badPassword: 'Invalid Password: length must be 6 to 36 symbols.',
        badClass: 'Invalid Class: must be one of: warror, mage, rogue.'
      };
      console.log(data.result);
      rpgMsg(resultToText[data.result]);
    });
  });

  $('#login').onClick(function (data) {
    login();
  });

  $('#logout').onClick(function (data) {
    game.stop();
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

  $('#sign-in').onClick(function () {
    if (game.isRunning()) {
      api.logout()
      .then(function () {
        $('#sign-in').fill('Sign In');
        rpgMsg('Logged out.');
        game.stop();
        location.reload();
      });
    }

  })

  $(function () {
    $('#server-address').onChange(function () {
      api.setServerAddress($('#server-address').val());
    });

    audio.init();

    var serverAddress = location.origin;
    if (location.protocol === 'file:') {
      serverAddress = 'http://localhost:6543';
    }
    $('#server-address').set('value', serverAddress);
    api.setServerAddress(serverAddress);
  });

  window.onbeforeunload = function () {
    api.logout();
  };
});
