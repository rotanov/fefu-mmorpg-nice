'use strict';

require([
  'minified',
  'audio',
  'game/api',
  'game/game',
  'lib/bluebird',
  'utils'

], function (mini, audio, api, game, Promise, utils) {
  var $ = mini.$;
  var $$ = mini.$$;
  var EE = mini.EE;
  var rpgMsg = utils.rpgMsg;

  function toggleGameScreen() {
    return new Promise(function (resolve, reject) {
      var height = 'calc(100vh - 141px - 20px - 1.5em - 5px)'
      var time = 400;
      Promise.join(
        $('#game-screen').animate({$height: height}, time),
        function () {
          resolve();
        }
      );
    });
  }

  function login() {
    $('#login').set({disabled: true});
    return api.login($$('#username').value
                   , $$('#password').value)
    .then(function (data) {
      rpgMsg('Signed in.');
      rpgMsg('Use arrows to move. Press "Z" to attack.')

      game.start(data)
      .then(function (view) {
        try {
          $('#game-screen').add(view);
          $(view).set({$height: '0vh', $display: 'block', $width: 'auto',
            '$margin-left': 'auto', '$margin-right': 'auto'});

          $('#login-form').animate({$height: '0px'}, 400)
          .then(toggleGameScreen)
          .then(function () {
            $(view).animate({$height: '100%'}, 200);
          })
          .catch(function (e) {
            console.log(e, e.stack);
          });

          $('#sign-in').fill('Sign Out');
          window.addEventListener('resize', function () {
            // renderer.view.style.width = $('#game-screen').get('$width');
            $('#message').set({scrollTop: $$('#message').scrollHeight});
          });
        } catch (e) {
          console.log(e, e.stack);
        }
      });
    })
    .catch(function (data) {
      if (data.result === 'invalidCredentials') {
        rpgMsg('Invalid login or password.');
      } else {
        rpgMsg('Unknown error');
        console.log(data, JSON.stringify(data));
      }
      $('#login').set({disabled: false});
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

  var muteAudio = function () {
    audio.mute();
    $('#mute-volume').set({title: 'Unmute'})
    .fill([EE('i', {$: 'fa fa-volume-off'}),
           EE('i', {$: 'fa fa-ban fa-stacked',
            $color: '#004358', $position: 'relative', $left: '-10px'})]);
  }

  $('#mute-volume').onClick(function () {
    if (!audio.isMuted()) {
      localStorage.setItem('muted', true);
      muteAudio();
    } else {
      localStorage.setItem('muted', false);
      audio.unmute();
      $('#mute-volume').set({title: 'Mute'})
      .fill(EE('i', {$: 'fa fa-volume-up'}));
    }
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
    $('body').set({$display: 'block'});
    $('#server-address').onChange(function () {
      api.setServerAddress($('#server-address').val());
    });

    audio.init();

    var muted = localStorage.getItem('muted');
    if (muted !== undefined && muted === "true") {
      muteAudio();
    }

    $('#login-form').animate({$height: '60vh'}, 300);

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
