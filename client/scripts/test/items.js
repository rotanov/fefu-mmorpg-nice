define([
  'lib/jquery',
  'lib/chai',
  'utils',
  'game/api'

], function ($, chai, utils, api) {
  var socket;
  var userData;
  var assert = chai.assert;
  var playerVelocity = 1;
  var slideThreshold = 0.1;
  var ticksPerSecond = 60;
  var pickUpRadius = 1.5;
  var screenRowCount = 7;
  var screenColumnCount = 7;
  var map = [
    [
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.'
    ],
    [
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.'
    ],
    [
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.'
    ],
    [
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.'
    ],
    [
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.'
    ],
    [
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.'
    ],
    [
      '.',
      '.',
      '.',
      '.',
      '.',
      '.',
      '.'
    ]
  ];
  var consts = {};

  function testItems() {
    utils.postToServer({
      'action': 'register',
      'login': 'testItems',
      'password': 'testItems'
    });

    userData = utils.postToServer({
      'action': 'login',
      'login': 'testItems',
      'password': 'testItems'
    });

    consts = {
      'action': 'setUpConst',
      'playerVelocity': playerVelocity,
      'slideThreshold': slideThreshold,
      'ticksPerSecond': ticksPerSecond,
      'screenRowCount': screenRowCount,
      'screenColumnCount': screenColumnCount,
      'pickUpRadius': pickUpRadius,
      'sid': userData.sid
    };

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

  function BF(done) {

    socket.setOnMessage(function (e) {
      var data = JSON.parse(e.data);

      switch (data.action) {
      case 'setUpConst':
        assert.equal('ok', data.result, 'set up constans');
        socket.setUpMap({
          'action': 'setUpMap',
          'map': map,
          'sid': userData.sid
        });

        break;

      case 'setUpMap':
        assert.equal('ok', data.result, 'load map');
        socket.setOnMessage(undefined);
        setTimeout(done, 1000);
      }
    });

    socket.setUpConst(consts);
  }

  function test() {

    describe.only('Items', function (done) {

      describe('Put Item', function () {
        beforeEach(BF);

        it('should successfully put item', function (done) {
          var item = {
            'x': 4.5,
            'y': 4.5
          };

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putItem':
              assert.equal('ok', data.result, 'put item');
              item.id = data.id;
              socket.singleExamine(item.id, userData.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(item.x, data.x, 'correspondence between coordinates x');
              assert.equal(item.y, data.y, 'correspondence between coordinates x');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putItem(item.x, item.y, makeItem(), userData.sid);
        });

        it('should fail put item [badSid]', function (done) {
          var item = {
            'x': 4.5,
            'y': 4.5
          };

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putItem':
              assert.equal('badSid', data.result, 'put item');
              item.id = data.id;
              socket.singleExamine(item.id, userData.sid);
              break;

            case 'examine':
              assert.equal('badId', data.result, 'examine request');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putItem(item.x, item.y, makeItem(), -1);
        });

      });

      describe('Pick Up', function () {
        beforeEach(BF);

        it('should successfully pick up item [item\'s center is less constant pickUpRadius]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {
            'x': player.x + 0.5,
            'y': player.y + 0.5
          };

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              socket.putItem(item.x, item.y, makeItem(), userData.sid);
              break;

            case 'putItem':
              assert.equal('ok', data.result, 'put item');
              item.id = data.id;
              socket.enforce({
                'action': 'pickUp',
                'id': item.id,
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('ok', data.actionResult.result, 'pick up item');
              socket.singleExamine(player.id, userData.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(item.id, data.inventory[0].id, 'item in inventory');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        it('should fail pick up item [item\'s center is more constant pickUpRadius]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {
            'x': player.x + pickUpRadius + 1,
            'y': player.y + pickUpRadius + 1
          };

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              socket.putItem(item.x, item.y, makeItem(), userData.sid);
              break;

            case 'putItem':
              assert.equal('ok', data.result, 'put item');
              item.id = data.id;
              socket.enforce({
                'action': 'pickUp',
                'id': item.id,
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('badId', data.actionResult.result, 'pick up item');
              socket.singleExamine(player.id, userData.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(undefined, data.inventory[0], 'no item in inventory');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        it('should successfully pick up item [item\'s center is equal constant pickUpRadius]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {
            'x': 3.5,
            'y': 2
          };
          //pickUpRadius = 1.5 = sqtr((3.5 - 3.5)^2 + (3.5 - 2)^2)

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.sid = data.sid;
              player.id = data.id;
              socket.putItem(item.x, item.y, makeItem(), userData.sid);
              break;

            case 'putItem':
              assert.equal('ok', data.result, 'put item');
              item.id = data.id;
              socket.enforce({
                'action': 'pickUp',
                'id': item.id,
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('ok', data.actionResult.result, 'pick up item');
              socket.singleExamine(player.id, userData.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(item.id, data.inventory[0].id, 'item in inventory');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        it('should fail pick up item [player already has it in inventory]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item');
              player.sid = data.sid;
              player.id = data.id;
              item.id = data.inventory[0].id;
              socket.enforce({
                'action': 'pickUp',
                'id': item.id,
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('badId', data.actionResult.result, 'pick up item');
              socket.singleExamine(player.id, userData.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(1, data.inventory.length, 'one item in inventory');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [makeItem()], {}, userData.sid);
        });

        it('should fail pick up item [object doesn\'t exists]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.sid = data.sid;
              player.id = data.id;
              item.id = -1;
              socket.enforce({
                'action': 'pickUp',
                'id': item.id,
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('badId', data.actionResult.result, 'pick up');
              socket.singleExamine(player.id, userData.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(0, data.inventory.length, 'no item in inventory');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        /*it("should fail pick up item [too heavy]", function(done) {
                            var player = {"x": 3.5, "y": 3.5}
                            var item = {"x": player.x + 0.5, "y": player.y + 0.5, "weight": 10000}
                            socket.setOnMessage(function(e) {
                                var data = JSON.parse(e.data)
                                switch(data.action) {
                                case "putPlayer":
                                    assert.equal("ok", data.result, "put player")
                                    player.id = data.id
                                    player.sid = data.sid
                                    socket.putItem(item.x, item.y, makeItem(item.weight), userData.sid)
                                    break
                                case "putItem":
                                    assert.equal("ok", data.result, "put item")
                                    item.id = data.id
                                    socket.enforce({"action": "pickUp", "id": item.id, "sid": player.sid}, userData.sid)
                                    break
                                case "enforce":
                                    assert.equal("ok", data.result, "enforce request")
                                    assert.equal("tooHeavy", data.actionResult.result, "pick up item")
                                    socket.singleExamine(player.id, userData.sid)
                                    break
                                case "examine":
                                    assert.equal("ok", data.result, "examine request")
                                    assert.equal(0, data.inventory.length, "no item in inventory")
                                    socket.setOnMessage(undefined)
                                    done()
                                }
                            })
                            socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid)
                        })*/

        it('should fail pick up item [object in other player\'s inventory]', function (done) {
          var flag = true;
          var player1 = {
            'x': 3.5,
            'y': 3.5
          };
          var player2 = {
            'x': 1.4,
            'y': 1.4
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);
            //console.log(data)

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              if (flag) {
                player1.id = data.id;
                player1.sid = data.sid;
                item.id = data.inventory[0].id;
                flag = false;

              } else {
                player2.sid = data.sid;
                socket.enforce({
                  'action': 'pickUp',
                  'id': item.id,
                  'sid': player2.sid
                }, userData.sid);
              }
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              if (data.actionResult.action === 'pickUp') {
                assert.equal('badId', data.actionResult.result, data.actionResult.action + ' request');
                socket.enforce({
                  'action': 'examine',
                  'id': player1.id,
                  'sid': player1.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
                assert.equal(item.id, data.actionResult.inventory[0].id, 'item in player\'s invetory');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.putPlayer(player1.x, player1.y, {}, [makeItem()], {}, userData.sid);
          socket.putPlayer(player2.x, player2.y, {}, [], {}, userData.sid);
        });

        it('should fail pick up item [object is player\'s fist]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.sid = data.sid;
              player.id = data.id;
              item.id = data.fistId;
              socket.enforce({
                'action': 'pickUp',
                'id': item.id,
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('badId', data.actionResult.result, 'pick up item');
              socket.singleExamine(player.id, userData.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(0, data.inventory.length, 'no item in inventory');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

      });

      describe('Destroy Item', function () {
        beforeEach(BF);

        it('should successfully destroy item [item\'s center is less constant pickUpRadius]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {
            'x': player.x + 0.5,
            'y': player.y + 0.5
          };

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.sid = data.sid;
              socket.putItem(item.x, item.y, makeItem(), userData.sid);
              break;

            case 'putItem':
              assert.equal('ok', data.result, 'put item');
              item.id = data.id;
              socket.enforce({
                'action': 'destroyItem',
                'id': item.id,
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('ok', data.actionResult.result, 'destroy item');
              socket.singleExamine(item.id, userData.sid);
              break;

            case 'examine':
              assert.equal('badId', data.result, 'examine request');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        it('should successfully destroy item [item\'s center is equal constant pickUpRadius]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {
            'x': 3.5,
            'y': 2
          };
          //pickUpRadius = 1.5 = sqtr((3.5 - 3.5)^2 + (3.5 - 2)^2)

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.sid = data.sid;
              socket.putItem(item.x, item.y, makeItem(), userData.sid);
              break;

            case 'putItem':
              assert.equal('ok', data.result, 'put item');
              item.id = data.id;
              socket.enforce({
                'action': 'destroyItem',
                'id': item.id,
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('ok', data.actionResult.result, 'destroy item');
              socket.singleExamine(item.id, userData.sid);
              break;

            case 'examine':
              assert.equal('badId', data.result, 'examine request');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        it('should fail destroy item [item\'s center is more constant pickUpRadius]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {
            'x': player.x + pickUpRadius + 1,
            'y': player.y + pickUpRadius + 1
          };

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.sid = data.sid;
              socket.putItem(item.x, item.y, makeItem(), userData.sid);
              break;

            case 'putItem':
              assert.equal('ok', data.result, 'put item');
              item.id = data.id;
              socket.enforce({
                'action': 'destroyItem',
                'id': item.id,
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('badId', data.actionResult.result, 'destroy item');
              socket.singleExamine(item.id, userData.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        it('should successfully destroy item from inventory', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);
            //console.log(data)

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item');
              player.sid = data.sid;
              player.id = data.id;
              item.id = data.inventory[0].id;
              socket.enforce({
                'action': 'destroyItem',
                'id': item.id,
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('ok', data.actionResult.result, 'destroy item');
              socket.singleExamine(player.id, userData.sid);
              break;

            case 'examine':
              if (data.type === 'player') {
                assert.equal('ok', data.result, 'examine request');
                assert.equal(undefined, data.inventory[0], 'no item in inventory');
                socket.singleExamine(item.id, userData.sid);

              } else {
                assert.equal('badId', data.result, 'item isn\'t exist');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.putPlayer(player.x, player.y, {}, [makeItem()], {}, userData.sid);
        });

        it('should fail destroy item [object doesn\'t exists]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              item.id = -1;
              socket.enforce({
                'action': 'destroyItem',
                'id': item.id,
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('badId', data.actionResult.result, 'destroy item');
              socket.singleExamine(player.id, userData.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(undefined, data.inventory[0], 'no item in inventory');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        it('should fail destroy item [badId: ID is invalid]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              item.id = '/';
              socket.enforce({
                'action': 'destroyItem',
                'id': item.id,
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('badId', data.actionResult.result, 'destroy item');
              socket.singleExamine(player.id, userData.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(undefined, data.inventory[0], 'no item in inventory');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        it('should fail destroy item [object in other player\'s inventory]', function (done) {
          var flag = true;
          var player1 = {
            'x': 3.5,
            'y': 3.5
          };
          var player2 = {
            'x': 1.4,
            'y': 1.4
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              if (flag) {
                player1.id = data.id;
                player1.sid = data.sid;
                item.id = data.inventory[0].id;
                flag = false;

              } else {
                player2.sid = data.sid;
                socket.enforce({
                  'action': 'destroyItem',
                  'id': item.id,
                  'sid': player2.sid
                }, userData.sid);
              }
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              if (data.actionResult.action === 'destroyItem') {
                assert.equal('badId', data.actionResult.result, data.actionResult.action + ' request');
                socket.enforce({
                  'action': 'examine',
                  'id': player1.id,
                  'sid': player1.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
                assert.equal(item.id, data.actionResult.inventory[0].id, 'item in player\'s invetory');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.putPlayer(player1.x, player1.y, {}, [makeItem()], {}, userData.sid);
          socket.putPlayer(player2.x, player2.y, {}, [], {}, userData.sid);
        });

        it('should fail destroy item [object is player\'s fist]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.sid = data.sid;
              player.id = data.id;
              item.id = data.fistId;
              socket.enforce({
                'action': 'destroyItem',
                'id': item.id,
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('badId', data.actionResult.result, 'destroy item');
              socket.singleExamine(player.id, userData.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(0, data.inventory.length, 'no item in inventory');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

      });

      describe('Drop', function () {
        beforeEach(BF);

        it('should successfully drop item from inventory', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);
            //console.log(data)

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item');
              player.sid = data.sid;
              player.id = data.id;
              item.id = data.inventory[0].id;
              socket.enforce({
                'action': 'drop',
                'id': item.id,
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('ok', data.actionResult.result, 'drop item');
              socket.singleExamine(player.id, userData.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              if (data.type === 'player') {
                assert.equal(undefined, data.inventory[0], 'no item in inventory');
                socket.singleExamine(item.id, userData.sid);

              } else if (data.type === 'item') {
                assert.equal(item.id, data.id, 'item is exist');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.putPlayer(player.x, player.y, {}, [makeItem()], {}, userData.sid);
        });

        it('should fail drop item [invalid sid]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item');
              player.sid = data.sid;
              player.id = data.id;
              item.id = data.inventory[0].id;
              socket.enforce({
                'action': 'drop',
                'id': item.id,
                'sid': -1
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('badSid', data.actionResult.result, 'drop item');
              socket.singleExamine(player.id, userData.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(item.id, data.inventory[0].id, 'item in inventory');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [makeItem()], {}, userData.sid);
        });

        it('should fail drop item [player hasn\'t it in inventory]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {
            'x': player.x + 0.5,
            'y': player.y + 0.5
          };

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.sid = data.sid;
              socket.putItem(item.x, item.y, makeItem(), userData.sid);
              break;

            case 'putItem':
              assert.equal('ok', data.result, 'put item');
              item.id = data.id;
              socket.enforce({
                'action': 'drop',
                'id': item.id,
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('badId', data.actionResult.result, 'drop item');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        it('should fail drop item [object doesn\'t exists]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.sid = data.sid;
              item.id = -1;
              socket.enforce({
                'action': 'drop',
                'id': item.id,
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('badId', data.actionResult.result, 'drop item');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        it('should fail drop item [object in other player\'s inventory]', function (done) {
          var flag = true;
          var player1 = {
            'x': 3.5,
            'y': 3.5
          };
          var player2 = {
            'x': 1.4,
            'y': 1.4
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              if (flag) {
                player1.id = data.id;
                player1.sid = data.sid;
                item.id = data.inventory[0].id;
                flag = false;

              } else {
                player2.sid = data.sid;
                socket.enforce({
                  'action': 'drop',
                  'id': item.id,
                  'sid': player2.sid
                }, userData.sid);
              }
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              if (data.actionResult.action === 'drop') {
                assert.equal('badId', data.actionResult.result, data.actionResult.action + ' request');
                socket.enforce({
                  'action': 'examine',
                  'id': player1.id,
                  'sid': player1.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
                assert.equal(item.id, data.actionResult.inventory[0].id, 'item in player\'s invetory');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.putPlayer(player1.x, player1.y, {}, [makeItem()], {}, userData.sid);
          socket.putPlayer(player2.x, player2.y, {}, [], {}, userData.sid);
        });

        it('should fail drop item [object is player\'s fist]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.sid = data.sid;
              player.id = data.id;
              item.id = data.fistId;
              socket.enforce({
                'action': 'drop',
                'id': item.id,
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('badId', data.actionResult.result, 'drop item');
              socket.singleExamine(player.id, userData.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(0, data.inventory.length, 'no item in inventory');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

      });

      describe('Equip', function () {
        beforeEach(BF);

        it('should successfully equip item from inventory', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item');
              player.id = data.id;
              player.sid = data.sid;
              item.id = data.inventory[0].id;
              socket.enforce({
                'action': 'equip',
                'id': item.id,
                'sid': player.sid,
                'slot': 'left-hand'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
              if (data.actionResult.action === 'equip') {
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                assert.equal(item.id, data.actionResult.slots['left-hand'].id, 'item in slot');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.putPlayer(player.x, player.y, {}, [makeItem()], {}, userData.sid);
        });

        it('should fail equip item [slot doesn\'t exist in request]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item');
              player.id = data.id;
              player.sid = data.sid;
              item.id = data.inventory[0].id;
              socket.enforce({
                'action': 'equip',
                'id': item.id,
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('badSlot', data.actionResult.result, data.actionResult.action + ' request');
              socket.singleExamine(player.id, userData.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(true, data.slots === undefined || data.slots['left-hand'] === undefined, 'no item in slot');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [makeItem()], {}, userData.sid);
        });

        it('should fail equip item from inventory [invalid slot specificator]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item');
              player.id = data.id;
              player.sid = data.sid;
              item.id = data.inventory[0].id;
              socket.enforce({
                'action': 'equip',
                'id': item.id,
                'sid': player.sid,
                'slot': 'ear'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              if (data.actionResult.action === 'equip') {
                assert.equal('badSlot', data.actionResult.result, data.actionResult.action + ' request');
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
                assert.equal(true, data.slots === undefined || data.slots.ear === undefined, 'no such slot');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.putPlayer(player.x, player.y, {}, [makeItem()], {}, userData.sid);
        });

        it('should fail equip item [invalid sid]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item');
              player.id = data.id;
              player.sid = data.sid;
              item.id = data.inventory[0].id;
              socket.enforce({
                'action': 'equip',
                'id': item.id,
                'sid': -1,
                'slot': 'left-hand'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              if (data.actionResult.action === 'equip') {
                assert.equal('badSid', data.actionResult.result, data.actionResult.action + ' request');
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
                assert.equal(true, data.slots === undefined || data.slots['left-hand'] === undefined, 'no item in slot');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.putPlayer(player.x, player.y, {}, [makeItem()], {}, userData.sid);
        });

        it('should fail equip item [object doesn\'t exists]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item');
              player.id = data.id;
              player.sid = data.sid;
              item.id = -1;
              socket.enforce({
                'action': 'equip',
                'id': item.id,
                'sid': player.sid,
                'slot': 'left-hand'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              if (data.actionResult.action === 'equip') {
                assert.equal('badId', data.actionResult.result, data.actionResult.action + ' request');
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
                assert.equal(true, data.slots === undefined || data.slots['left-hand'] === undefined, 'no item in slot');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        it('should fail equip item [object doesn\'t match slot]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item');
              player.id = data.id;
              player.sid = data.sid;
              item.id = data.inventory[0].id;
              socket.enforce({
                'action': 'equip',
                'id': item.id,
                'sid': player.sid,
                'slot': 'feet'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              if (data.actionResult.action === 'equip') {
                assert.equal('badSlot', data.actionResult.result, data.actionResult.action + ' request');
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);
              }
              if (data.actionResult.action === 'examine') {
                assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
                assert.equal(true, data.slots === undefined || data.slots.feet === undefined, 'no item in slot');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.putPlayer(player.x, player.y, {}, [makeItem()], {}, userData.sid);
        });

        it('should fail equip item [object in other player\'s inventory]', function (done) {
          var flag = true;
          var player1 = {
            'x': 3.5,
            'y': 3.5
          };
          var player2 = {
            'x': 1.4,
            'y': 1.4
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              if (flag) {
                player1.id = data.id;
                player1.sid = data.sid;
                item.id = data.inventory[0].id;
                flag = false;

              } else {
                player2.id = data.id;
                player2.sid = data.sid;
                socket.enforce({
                  'action': 'equip',
                  'id': item.id,
                  'sid': player2.sid,
                  'slot': 'left-hand'
                }, userData.sid);
              }
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              if (data.actionResult.action === 'equip') {
                assert.equal('badId', data.actionResult.result, data.actionResult.action + ' request');
                socket.enforce({
                  'action': 'examine',
                  'id': player2.id,
                  'sid': player2.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
                assert.equal(true, data.slots === undefined || data.slots['left-hand'] === undefined, 'no item in slot');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.putPlayer(player1.x, player1.y, {}, [makeItem()], {}, userData.sid);
          socket.putPlayer(player2.x, player2.y, {}, [], {}, userData.sid);
        });

        it('should successfully equip item [item\'s center is equal constant pickUpRadius]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {
            'x': 3.5,
            'y': 2
          };
          //pickUpRadius = 1.5 = sqtr((3.5 - 3.5)^2 + (3.5 - 2)^2)

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              socket.putItem(item.x, item.y, makeItem(), userData.sid);
              break;

            case 'putItem':
              assert.equal('ok', data.result, 'put item');
              item.id = data.id;
              socket.enforce({
                'action': 'equip',
                'id': item.id,
                'sid': player.sid,
                'slot': 'left-hand'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
              if (data.actionResult.action === 'equip') {
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                assert.equal(item.id, data.actionResult.slots['left-hand'].id, 'item in slot');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        it('should successfully equip item [item\'s center is less constant pickUpRadius]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {
            'x': player.x + 0.5,
            'y': player.y + 0.5
          };

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.sid = data.sid;
              player.id = data.id;
              socket.putItem(item.x, item.y, makeItem(), userData.sid);
              break;

            case 'putItem':
              assert.equal('ok', data.result, 'put item');
              item.id = data.id;
              socket.enforce({
                'action': 'equip',
                'id': item.id,
                'sid': player.sid,
                'slot': 'left-hand'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
              if (data.actionResult.action === 'equip') {
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                assert.equal(item.id, data.actionResult.slots['left-hand'].id, 'item in slot');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        it('should fail equip item [item\'s center is more constant pickUpRadius]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {
            'x': player.x + pickUpRadius + 1,
            'y': player.y + pickUpRadius + 1
          };

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              socket.putItem(item.x, item.y, makeItem(), userData.sid);
              break;

            case 'putItem':
              assert.equal('ok', data.result, 'put item');
              item.id = data.id;
              socket.enforce({
                'action': 'equip',
                'id': item.id,
                'sid': player.sid,
                'slot': 'left-hand'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              if (data.actionResult.action === 'equip') {
                assert.equal('badId', data.actionResult.result, data.actionResult.action + ' request');
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
                assert.equal(true, data.slots === undefined || data.slots['left-hand'] === undefined, 'no item in slot');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        it('should successfully equip item [slot is already occupied item that was on the ground]', function (done) {
          var flag = true;
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {
            'x': player.x + 0.5,
            'y': player.y + 0.5
          };
          var p_item_id;

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item');
              player.id = data.id;
              player.sid = data.sid;
              p_item_id = data.inventory[0].id;
              socket.putItem(item.x, item.y, makeItem(), userData.sid);
              break;

            case 'putItem':
              assert.equal('ok', data.result, 'put item');
              item.id = data.id;
              socket.enforce({
                'action': 'equip',
                'id': p_item_id,
                'sid': player.sid,
                'slot': 'left-hand'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
              if (data.actionResult.action === 'equip') {
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                if (flag) {
                  flag = false;
                  assert.equal(p_item_id, data.actionResult.slots['left-hand'].id, 'equip item1');
                  socket.enforce({
                    'action': 'equip',
                    'id': item.id,
                    'sid': player.sid,
                    'slot': 'left-hand'
                  }, userData.sid);

                } else {
                  assert.equal(item.id, data.actionResult.slots['left-hand'].id, 'equip item2');
                  socket.setOnMessage(undefined);
                  done();
                }
              }
            }
          });

          socket.putPlayer(player.x, player.y, {}, [makeItem()], {}, userData.sid);
        });

        it('should successfully equip item [slot is already occupied item that was in inventory]', function (done) {
          var flag = true;
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item1_id;
          var item2_id;

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item');
              player.id = data.id;
              player.sid = data.sid;
              item1_id = data.inventory[0].id;
              item2_id = data.inventory[1].id;
              socket.enforce({
                'action': 'equip',
                'id': item1_id,
                'sid': player.sid,
                'slot': 'left-hand'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
              if (data.actionResult.action === 'equip') {
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                if (flag) {
                  flag = false;
                  assert.equal(item1_id, data.actionResult.slots['left-hand'].id, 'equip item');
                  socket.enforce({
                    'action': 'equip',
                    'id': item2_id,
                    'sid': player.sid,
                    'slot': 'left-hand'
                  }, userData.sid);

                } else {
                  assert.equal(item2_id, data.actionResult.slots['left-hand'].id, 'equip item');
                  socket.setOnMessage(undefined);
                  done();
                }
              }
            }
          });

          socket.putPlayer(player.x, player.y, {}, [
            makeItem(),
            makeItem()
          ], {}, userData.sid);
        });

        it('should fail equip item [object is player\'s fist]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.sid = data.sid;
              player.id = data.id;
              item.id = data.fistId;
              socket.enforce({
                'action': 'equip',
                'id': item.id,
                'sid': player.sid,
                'slot': 'left-hand'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('badId', data.actionResult.result, 'equip item');
              socket.singleExamine(player.id, userData.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(0, data.inventory.length, 'no item in inventory');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        it('should successfully equip item with bonus from inventory                 [change of stats if effectCalculation - const]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5,
            'STRENGTH': 5,
            'SPEED': 10
          };
          var bonus1 = {
            'stat': 'STRENGTH',
            'effectCalculation': 'const',
            'value': 10
          };
          var bonus2 = {
            'stat': 'SPEED',
            'effectCalculation': 'const',
            'value': -5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item');
              player.id = data.id;
              player.sid = data.sid;
              item.id = data.inventory[0].id;
              socket.enforce({
                'action': 'equip',
                'id': item.id,
                'sid': player.sid,
                'slot': 'left-hand'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
              if (data.actionResult.action === 'equip') {
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                assert.equal(item.id, data.actionResult.slots['left-hand'].id, 'item in slot');
                assert.equal(player.STRENGTH + bonus1.value, data.actionResult.stats.STRENGTH, 'bonus1: change of stats');
                assert.equal(player.SPEED + bonus2.value, data.actionResult.stats.SPEED, 'bonus2: change of stats');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.putPlayer(player.x, player.y, {
            'STRENGTH': player.STRENGTH,
            'SPEED': player.SPEED
          }, [makeItem(null, null, null, [
              bonus1,
              bonus2
            ])], {}, userData.sid);
        });

        it('should successfully equip item with bonus from inventory                [change of stats if effectCalculation - percent]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5,
            'STRENGTH': 10
          };
          var bonus = {
            'stat': 'STRENGTH',
            'effectCalculation': 'percent',
            'value': 10
          };
          var item = {};
          var answer = player.STRENGTH + player.STRENGTH * bonus.value / 100;

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item');
              player.id = data.id;
              player.sid = data.sid;
              item.id = data.inventory[0].id;
              socket.enforce({
                'action': 'equip',
                'id': item.id,
                'sid': player.sid,
                'slot': 'left-hand'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
              if (data.actionResult.action === 'equip') {
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                assert.equal(item.id, data.actionResult.slots['left-hand'].id, 'item in slot');
                assert.equal(answer, data.actionResult.stats.STRENGTH, 'change of stats');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.putPlayer(player.x, player.y, { 'STRENGTH': player.STRENGTH }, [makeItem(null, null, null, [bonus])], {}, userData.sid);
        });

      });

      describe('Unequip', function () {
        beforeEach(BF);

        it('should successfully unequip item', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item and slot');
              player.id = data.id;
              player.sid = data.sid;
              socket.enforce({
                'action': 'unequip',
                'sid': player.sid,
                'slot': 'left-hand'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
              if (data.actionResult.action === 'unequip') {
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                assert.equal(true, data.slots === undefined || data.slots['left-hand'] === undefined, 'slot is empty');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.putPlayer(player.x, player.y, {}, [makeItem()], { 'left-hand': makeItem() }, userData.sid);
        });

        it('should fail unequip item [invalid slot specificator]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              socket.enforce({
                'action': 'unequip',
                'sid': player.sid,
                'slot': 'ear'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              if (data.actionResult.action === 'unequip') {
                assert.equal('badSlot', data.actionResult.result, data.actionResult.action + ' request');
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
                assert.equal(true, data.slots === undefined || data.slots.ear === undefined, 'no such slot');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        it('should fail unequip item [slot doesn\'t exist in request]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              socket.enforce({
                'action': 'unequip',
                'sid': player.sid
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('badSlot', data.actionResult.result, data.actionResult.action + ' request');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        it('should successfully unequip item with bonus                 [change of stats if effectCalculation - const]', function (done) {
          var flag = true;
          var player = {
            'x': 3.5,
            'y': 3.5,
            'STRENGTH': 5,
            'SPEED': 10
          };
          var bonus1 = {
            'stat': 'STRENGTH',
            'effectCalculation': 'const',
            'value': 10
          };
          var bonus2 = {
            'stat': 'SPEED',
            'effectCalculation': 'const',
            'value': -5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item');
              player.id = data.id;
              player.sid = data.sid;
              item.id = data.inventory[0].id;
              socket.enforce({
                'action': 'equip',
                'id': item.id,
                'sid': player.sid,
                'slot': 'left-hand'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
              if (data.actionResult.action === 'equip') {
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                if (flag) {
                  flag = false;
                  assert.equal(item.id, data.actionResult.slots['left-hand'].id, 'item in slot');
                  assert.equal(player.STRENGTH + bonus1.value, data.actionResult.stats.STRENGTH, 'bonus1: change of stats');
                  assert.equal(player.SPEED + bonus2.value, data.actionResult.stats.SPEED, 'bonus2: change of stats');
                  socket.enforce({
                    'action': 'unequip',
                    'sid': player.sid,
                    'slot': 'left-hand'
                  }, userData.sid);

                } else {
                  assert.equal(undefined, data.actionResult.slots['left-hand'], 'no item in slot');
                  assert.equal(player.STRENGTH, data.actionResult.stats.STRENGTH, 'bonus1: change of stats after unequip');
                  assert.equal(player.SPEED, data.actionResult.stats.SPEED, 'bonus2: change of stats after unequip');
                  socket.setOnMessage(undefined);
                  done();
                }

              } else if (data.actionResult.action === 'unequip') {
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);
              }
            }
          });

          socket.putPlayer(player.x, player.y, {
            'STRENGTH': player.STRENGTH,
            'SPEED': player.SPEED
          }, [makeItem(null, null, null, [
              bonus1,
              bonus2
            ])], {}, userData.sid);
        });

      });

      describe('Equip / Unequip', function () {
        beforeEach(BF);

        it('should successfully equip/unequip item', function (done) {
          var flag = true;
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item');
              player.id = data.id;
              player.sid = data.sid;
              item.id = data.inventory[0].id;
              socket.enforce({
                'action': 'equip',
                'id': item.id,
                'sid': player.sid,
                'slot': 'left-hand'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
              if (data.actionResult.action === 'equip') {
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                if (flag) {
                  flag = false;
                  assert.equal(item.id, data.actionResult.slots['left-hand'].id, 'equip item');
                  socket.enforce({
                    'action': 'unequip',
                    'sid': player.sid,
                    'slot': 'left-hand'
                  }, userData.sid);

                } else {
                  assert.equal(true, data.slots === undefined || data.slots['left-hand'] === undefined, 'unequip item');
                  socket.setOnMessage(undefined);
                  done();
                }

              } else if (data.actionResult.action === 'unequip') {
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);
              }
            }
          });

          socket.putPlayer(player.x, player.y, {}, [makeItem()], {}, userData.sid);
        });

        it('should successfully equip/unequip item [slot is already occupied]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {
            'x': player.x + 0.5,
            'y': player.y + 0.5
          };

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item');
              player.id = data.id;
              player.sid = data.sid;
              item.id = data.inventory[0].id;
              socket.enforce({
                'action': 'equip',
                'id': item.id,
                'sid': player.sid,
                'slot': 'left-hand'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
              if (data.actionResult.action === 'equip') {
                socket.enforce({
                  'action': 'unequip',
                  'sid': player.sid,
                  'slot': 'left-hand'
                }, userData.sid);

              } else if (data.actionResult.action === 'unequip') {
                socket.singleExamine(player.id, player.sid);
              }
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(true, data.slots === undefined || data.slots['left-hand'] === undefined, 'slot isn\'t occupied');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [makeItem()], { 'left-hand': makeItem() }, userData.sid);
        });

        it('should successfully equip/unequip item [slot is already occupied]', function (done) {
          var flag = true;
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var item = {
            'x': player.x + 0.5,
            'y': player.y + 0.5
          };
          var p_item_id;

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player with item');
              player.id = data.id;
              player.sid = data.sid;
              p_item_id = data.inventory[0].id;
              socket.putItem(item.x, item.y, makeItem(), userData.sid);
              break;

            case 'putItem':
              assert.equal('ok', data.result, 'put item');
              item.id = data.id;
              socket.enforce({
                'action': 'equip',
                'id': p_item_id,
                'sid': player.sid,
                'slot': 'left-hand'
              }, userData.sid);
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              assert.equal('ok', data.actionResult.result, data.actionResult.action + ' request');
              if (data.actionResult.action === 'equip') {
                socket.enforce({
                  'action': 'examine',
                  'id': player.id,
                  'sid': player.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                if (flag) {
                  flag = false;
                  assert.equal(p_item_id, data.actionResult.slots['left-hand'].id, '#1 equip item');
                  socket.enforce({
                    'action': 'equip',
                    'id': item.id,
                    'sid': player.sid,
                    'slot': 'left-hand'
                  }, userData.sid);

                } else {
                  assert.equal(item.id, data.actionResult.slots['left-hand'].id, '#2 equip item');
                  socket.enforce({
                    'action': 'unequip',
                    'sid': player.sid,
                    'slot': 'left-hand'
                  }, userData.sid);
                }

              } else if (data.actionResult.action === 'unequip') {
                socket.singleExamine(player.id, userData.sid);
              }
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(undefined, data.slots['left-hand'], 'slot isn\'t occupied');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [makeItem()], {}, userData.sid);
        });

        it('should fail unequip item [object in other player\'s slot]', function (done) {
          var flag = true;
          var putPlayer = true;
          var player1 = {
            'x': 3.5,
            'y': 3.5
          };
          var player2 = {
            'x': 1.4,
            'y': 1.4
          };
          var item = {};

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              if (putPlayer) {
                player1.id = data.id;
                player1.sid = data.sid;
                item.id = data.inventory[0].id;
                putPlayer = false;
                socket.enforce({
                  'action': 'equip',
                  'id': item.id,
                  'sid': player1.sid,
                  'slot': 'left-hand'
                }, userData.sid);

              } else {
                player2.id = data.id;
                player2.sid = data.sid;
              }
              break;

            case 'enforce':
              assert.equal('ok', data.result, 'enforce request');
              if (data.actionResult.action === 'equip') {
                assert.equal('ok', data.actionResult.result, 'equip request');
                socket.enforce({
                  'action': 'examine',
                  'id': player1.id,
                  'sid': player1.sid
                }, userData.sid);

              } else if (data.actionResult.action === 'examine') {
                assert.equal('ok', data.actionResult.result, 'examine request');
                if (flag) {
                  flag = false;
                  assert.equal(item.id, data.actionResult.slots['left-hand'].id, 'equip item');
                  socket.enforce({
                    'action': 'unequip',
                    'sid': player2.sid,
                    'slot': 'left-hand'
                  }, userData.sid);

                } else {
                  assert.equal(true, data.slots === undefined || data.slots['left-hand'] === undefined, 'no item in slot');
                  socket.setOnMessage(undefined);
                  done();
                }

              } else if (data.actionResult.action === 'unequip') {
                assert.equal('badId', data.actionResult.result, 'unequip request');
                socket.enforce({
                  'action': 'examine',
                  'id': player2.id,
                  'sid': player2.sid
                }, userData.sid);
              }
              break;

            }
          });

          socket.putPlayer(player1.x, player1.y, {}, [makeItem()], {}, userData.sid);
          socket.putPlayer(player2.x, player2.y, {}, [], {}, userData.sid);
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

        } else if (data.action === 'logout') {
          assert.equal('ok', data.result);
        }
      });

      socket.stopTesting(userData.sid);
      socket.logout(userData.sid);  //socket.setOnMessage(undefined)
    });

    mocha.run();
  }

  function makeItem(weight, class_, type, bonuses, effects, subtype) {
    weight = weight || 1;
    class_ = class_ || 'garment';
    type = type || 'shield';
    bonuses = bonuses || [];
    effects = effects || [];
    var item = {
      'weight': weight,
      'class': class_,
      'type': type,
      'bonuses': bonuses,
      'effects': effects
    };
    if (subtype) {
      item.subtype = subtype;
    }
    return item;
  }

  return {
    run: testItems,
    makeItem: makeItem
  };
});
