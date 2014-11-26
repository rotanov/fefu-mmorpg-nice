'use strict';

define([
  'minified',
  'lib/chai',
  'utils',
  'game/api'

], function ($, chai, utils, api) {

  var assert = chai.assert;

  var fail = function(done, data, cond) {
    if (cond === undefined
        || !cond) {
      done(new Error(JSON.stringify(data)));
    } else {
      done();
    }
  }

  describe('Authentication ', function () {

    it('Its ok to register IvanPes:123456', function (done) {
      api.register('IvanPes', '123456', 'mage')
      .then(function (data) { done(); })
      .catch(function (data) { fail(done, data); });
    });

    it('Its ok to register Ivan123:123456', function (done) {
      api.register('Ivan123', '123456', 'warrior')
      .then(function (data) { done(); })
      .catch(function (data) { fail(done, data); });
    });

    it('Its wrong (badPassword) to register 123Ivan:123', function (done) {
      api.register('123Ivan', '123', 'mage')
      .then(function (data) { fail(done, data); }, function (data) {
        fail(done, data, data.result === 'badPassword');
      });
    });

    it('Long password is wrong (badPassword)', function (done) {
      api.register('00Ivan00', '0123456789012345678901234567890123456789', 'rogue')
      .then(function (data) { fail(done, data); }, function (data) {
        fail(done, data, data.result === 'badPassword');
      });
    });

    it('Should return badLogin (invalid characters)', function (done) {
      api.register('  ', '0123456', 'mage')
      .then(function (data) { fail(done, data); }, function (data) {
        fail(done, data, data.result === 'badLogin');
      });
    });

    it('Should return badLogin (invalid characters)', function (done) {
      api.register('\uFFFD\uFFFD\uFFFD\uFFFD', '0123456', 'mage')
      .then(function (data) { fail(done, data); }, function (data) {
        fail(done, data, data.result === 'badLogin');
      });
    });

    it('Should return badLogin (too short)', function (done) {
      api.register('A', '0123456', 'mage')
      .then(function (data) { fail(done, data); }, function (data) {
        fail(done, data, data.result === 'badLogin');
      });
    });

    it('Should return badLogin (too long)', function (done) {
      api.register('AaaaaBbbbbCccccDddddEeeeeFffffGggggHhhhh', '0123456', 'mage')
      .then(function (data) { fail(done, data); }, function (data) {
        fail(done, data, data.result === 'badLogin');
      });
    });

    it('Should return loginExists', function (done) {
      api.register('IvanPes', '123456', 'mage')
      .then(function (data) { fail(done, data); }, function (data) {
        fail(done, data, data.result === 'loginExists');
      });
    });

    it('Logging in with IvanPes:123456 is ok', function (done) {
      api.login('IvanPes', '123456')
      .then(function (data) { done(); }, function (data) { fail(done, data); });
    });

    it('Should return invalidCredentials (login does not exist)', function (done) {
      api.login('Unknown', '123456', 'mage')
      .then(function (data) { fail(done, data); }, function (data) {
        fail(done, data, data.result === 'invalidCredentials');
      });
    });

    it('Should return invalidCredentials (incorrect password)', function (done) {
      api.login('IvanPes', 'Mumbo-jumbo', 'mage')
      .then(function (data) { fail(done, data); }, function (data) {
        fail(done, data, data.result === 'invalidCredentials');
      });
    });

    it('Logging out now should be ok', function (done) {
      api.logout()
      .then(function (data) { done(); }
          , function (data) { fail(done, data); });
    });

    it('Logging out once again is wrong (badSid)', function (done) {
      api.logout()
      .then(function (data) { done(); }
          , function (data) { fail(done, data, data.result === 'badSid'); });
    });

    it('Logging out once again is wrong (badSid)', function (done) {
      api.logout()
      .then(function (data) { done(); }
          , function (data) { fail(done, data, data.result === 'badSid'); });
    });

  });

  before(function (done) {
    api.startTesting()
    .then(function () { done(); }
        , function (data) { fail(done, data); });
  });

  after(function (done) {
    api.stopTesting()
    .then(function () { done(); }
        , function (data) { fail(done, data); });
  });

});
