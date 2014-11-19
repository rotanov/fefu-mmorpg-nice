define([
  'lib/jquery',
  'lib/chai',
  'utils',
  'game/api'

], function ($, chai, utils, api) {
  var userData;

  function testRegister() {
    utils.postToServer({
      'action': 'register',
      'login': 'WebSocket',
      'password': 'WebSocket'
    });

    userData = utils.postToServer({
      'action': 'login',
      'login': 'WebSocket',
      'password': 'WebSocket'
    });

    onopen = function () {
      socket.startTesting(userData.sid);
    };

    onmessage = function (e) {
      var data = JSON.parse(e.data);
      if (data.action === 'startTesting' && data.result === 'ok') {
        test();
      }
    };
    socket = ws.WSConnect(userData.webSocket, onopen, onmessage);
  }

  function test() {
    var assert = chai.assert;

    describe.only('Register', function () {

      describe.only('Registration', function () {

        it('should return ok', function () {
          assert.equal('ok', utils.postToServer({
            'action': 'register',
            'login': 'IvanPes',
            'password': '123456'
          }).result);
        });

        it('should return ok', function () {
          assert.equal('ok', utils.postToServer({
            'action': 'register',
            'login': 'Ivan123',
            'password': '123456'
          }).result);
        });

        it('should return badPassword [too short]', function () {
          assert.equal('badPassword', utils.postToServer({
            'action': 'register',
            'login': '123Ivan',
            'password': '123'
          }).result);
        });

        it('should return badPassword [too long]', function () {
          assert.equal('badPassword', utils.postToServer({
            'action': 'register',
            'login': '00Ivan00',
            'password': '0123456789012345678901234567890123456789'
          }).result);
        });

        it('should return badLogin [invalid characters]', function () {
          assert.equal('badLogin', utils.postToServer({
            'action': 'register',
            'login': '  ',
            'password': '0123456'
          }).result);
        });

        it('should return badLogin [invalid characters]', function () {
          assert.equal('badLogin', utils.postToServer({
            'action': 'register',
            'login': '\uFFFD\uFFFD\uFFFD\uFFFD',
            'password': '0123456'
          }).result);
        });

        it('should return badLogin [too short]', function () {
          assert.equal('badLogin', utils.postToServer({
            'action': 'register',
            'login': 'A',
            'password': '0123456'
          }).result);
        });

        it('should return badLogin [too long]', function () {
          assert.equal('badLogin', utils.postToServer({
            'action': 'register',
            'login': 'AaaaaBbbbbCccccDddddEeeeeFffffGggggHhhhh',
            'password': '0123456'
          }).result);
        });

        it('should return loginExists', function () {
          assert.equal('loginExists', utils.postToServer({
            'action': 'register',
            'login': 'IvanPes',
            'password': '123456'
          }).result);
        });

      });

      var sid;

      describe('Login', function () {

        it('should return ok', function () {
          data = utils.postToServer({
            'action': 'login',
            'login': 'IvanPes',
            'password': '123456'
          });

          sid = data.sid;
          wsUri = data.webSocket;
          assert.equal('ok', data.result);
        });

        it('should return invalidCredentials' + '[login does not exist]', function () {
          assert.equal('invalidCredentials', utils.postToServer({
            'action': 'login',
            'login': 'Unknown',
            'password': '123456'
          }).result);
        });

        it('should return invalidCredentials' + '[incorrect password]', function () {
          assert.equal('invalidCredentials', utils.postToServer({
            'action': 'login',
            'login': 'IvanPes',
            'password': 'Mumbo-jumbo'
          }).result);
        });

      });

      describe('Logout', function () {

        it('should return ok', function () {
          assert.equal('ok', utils.postToServer({
            'action': 'logout',
            'sid': sid
          }).result);
        });

        it('should return badSid', function () {
          assert.equal('badSid', utils.postToServer({
            'action': 'logout',
            'sid': sid
          }).result);
        });

        it('should return badSid', function () {
          assert.equal('badSid', utils.postToServer({
            'action': 'logout',
            'sid': ''
          }).result);
        });

      });

    });

    after(function () {

      socket.setOnMessage(function (e) {
        var data = JSON.parse(e.data);
        if (data.action === 'stopTesting') {
          if (data.result === 'badAction') {
            $('#msg').text('Invalid action.').css('color', 'red');

          } else if (data.result === 'ok') {
            $('#msg').text('Test is successful.').css('color', 'green');
          }
        }
      });

      socket.stopTesting(userData.sid)  //socket.setOnMessage(undefined)
;
    });

    mocha.run();
  }
  return { run: testRegister };
});
