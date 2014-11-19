define([
  'lib/jquery',
  'lib/chai',
  'utils',
  'game/api',
  'test/items'

], function ($, chai, utils, api, it_) {
  var socket;
  var userData;
  var consts = {};
  var defaultDamage = '3d2';

  function testPlayers() {
    utils.postToServer({
      'action': 'register',
      'login': 'testPlayers',
      'password': 'testPlayers'
    });

    userData = utils.postToServer({
      'action': 'login',
      'login': 'testPlayers',
      'password': 'testPlayers'
    });

    consts = {
      'action': 'setUpConst',
      'playerVelocity': 0.15,
      'slideThreshold': 0.23,
      'ticksPerSecond': 60,
      'screenRowCount': 4,
      'screenColumnCount': 3,
      'pickUpRadius': 3,
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

  function runBeforeEach(done) {
    console.log('running afterEach function...');
    setTimeout(done, 1000);
  }

  function test() {
    var assert = chai.assert;

    describe.only('Players', function (done) {

      before(function (done) {

        socket.setOnMessage(function (e) {
          var data = JSON.parse(e.data);
          if (data.action === 'setUpConst') {
            assert.equal('ok', data.result);
            done();
          }
        });

        socket.setUpConst(consts);
      });

      describe('Put Player', function () {
        beforeEach(runBeforeEach);

        it('should fail put player [badPlacing: map doesn\'t set]', function (done) {
          var player = {
            'x': 0.5,
            'y': 0.5
          };

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'putPlayer':
              assert.equal('badPlacing', data.result, 'put player');
              player.id = data.id;
              socket.singleExamine(player.id, userData.sid);
              break;

            case 'examine':
              assert.equal('badId', data.result, 'examine request');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
        });

        it('should fail put player [player\'s collision with walls]', function (done) {
          var player = {
            'x': 1.5,
            'y': 1.5
          };
          var tick = null;
          var map = [
            [
              '#',
              '#',
              '#'
            ],
            [
              '#',
              '.',
              '#'
            ],
            [
              '#',
              '#',
              '#'
            ]
          ];

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);
            if (data.tick) {
              tick = data.tick;
            }

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              socket.move('west', tick, player.sid);
            case 'move':
              assert.equal('ok', data.result, 'move');
              socket.singleExamine(player.id, player.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(player.x, data.x, 'can\'t move by x');
              assert.equal(player.y, data.y, 'can\'t move by y');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should successfully put player', function (done) {
          var player = {
            'x': 1.5,
            'y': 1.5
          };
          var map = [
            [
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.'
            ]
          ];

          socket.setOnMessage(function (e) {
            //console.log(JSON.parse(e.data))
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [it_.makeItem()], {}, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              assert.property(data, 'fistId');
              assert.isDefined(data.fistId);
              player.id = data.id;
              socket.singleExamine(player.id, userData.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(player.x, data.x);
              assert.equal(player.y, data.y);
              assert.property(data, 'inventory');
              //assert.isDefined(data.inventory[0])
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should fail put player [put player on another player]', function (done) {
          var flag = true;
          var player = {
            'x': 1.5,
            'y': 1.5
          };
          var map = [
            [
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.'
            ]
          ];

          socket.setOnMessage(function (e) {
            //console.log(JSON.parse(e.data))
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              if (flag) {
                flag = false;
                assert.equal('ok', data.result, 'put player1');
                socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);

              } else {
                assert.equal('badPlacing', data.result, 'put player2');
                player.id = data.id;
                socket.singleExamine(player.id, userData.sid);
              }
              break;

            case 'examine':
              assert.equal('badId', data.result, 'examine request');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should fail put player [cross players]', function (done) {
          var flag = true;
          var player = {
            'x': 1.5,
            'y': 1.5
          };
          var map = [
            [
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.'
            ]
          ];

          socket.setOnMessage(function (e) {
            //console.log(JSON.parse(e.data))
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              if (flag) {
                flag = false;
                assert.equal('ok', data.result, 'put player1');
                socket.putPlayer(player.x + 0.5, player.y + 0.5, {}, [], {}, userData.sid);

              } else {
                assert.equal('badPlacing', data.result, 'put player2');
                player.id = data.id;
                socket.singleExamine(player.id, userData.sid);
              }
              break;

            case 'examine':
              assert.equal('badId', data.result, 'examine request');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should successfully put player [narrow corridor]', function (done) {
          var flag = true;
          var player = {
            'x': 1.5,
            'y': 0.5
          };
          var map = [[
              '#',
              '.',
              '.',
              '#'
            ]];

          socket.setOnMessage(function (e) {
            //console.log(JSON.parse(e.data))
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              if (flag) {
                flag = false;
                assert.equal('ok', data.result, 'put player1');
                socket.putPlayer(player.x + 1, player.y, {}, [], {}, userData.sid);

              } else {
                assert.equal('ok', data.result, 'put player2');
                player.id = data.id;
                socket.singleExamine(player.id, userData.sid);
              }
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should fail put player [badPlacing: out of map]', function (done) {
          var player = {
            'x': 3.5,
            'y': 3.5
          };
          var map = [['.']];

          socket.setOnMessage(function (e) {
            //console.log(JSON.parse(e.data))
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('badPlacing', data.result, 'put player');
              player.id = data.id;
              socket.singleExamine(player.id, userData.sid);
              break;

            case 'examine':
              assert.equal('badId', data.result, 'examine request');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should fail put player [badPlacing: coordinates are incorrect]', function (done) {
          var player = {
            'x': '.',
            'y': '.'
          };
          var map = [['.']];

          socket.setOnMessage(function (e) {
            //console.log(JSON.parse(e.data))
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('badPlacing', data.result, 'put player');
              player.id = data.id;
              setTimeout(socket.singleExamine(player.id, userData.sid), 500);
              break;

            case 'examine':
              assert.equal('badId', data.result, 'examine request');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should put two players with different ids and sids', function (done) {
          var flag = true;
          var player1 = {
            'x': 0.5,
            'y': 0.5
          };
          var player2 = {
            'x': 1.5,
            'y': 1.5
          };
          var map = [
            [
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.'
            ]
          ];

          socket.setOnMessage(function (e) {
            //console.log(JSON.parse(e.data))
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player1.x, player1.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              if (flag) {
                flag = false;
                assert.equal('ok', data.result, 'put player');
                player1.id = data.id;
                player1.sid = data.sid;
                socket.putPlayer(player2.x, player2.y, {}, [], {}, userData.sid);

              } else {
                assert.equal('ok', data.result, 'put player');
                player2.id = data.id;
                player2.sid = data.sid;
                assert.notEqual(player1.id, player2.id, 'different ids');
                assert.notEqual(player1.sid, player2.sid, 'different sids');
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should successfully put players in all cells', function (done) {
          var map = [
            [
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.'
            ]
          ];
          var counter = 0;
          var cellsCount = map.length * map[0].length;

          socket.setOnMessage(function (e) {
            //console.log(JSON.parse(e.data))
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              for (var i = 0, l = map.length; i < l; ++i) {
                for (var j = 0, l = map[i].length; j < l; ++j) {
                  socket.putPlayer(i + 0.5, j + 0.5, {}, [], {}, userData.sid);
                }
              }
              break;

            case 'putPlayer':
              ++counter;
              assert.equal('ok', data.result, 'put player ' + counter);
              if (counter === cellsCount) {
                done();
              }
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should fail put player             [badPlacing: intersection with another player]', function (done) {
          var flag = true;
          var player1 = {
            'x': 0.5,
            'y': 0.5
          };
          var player2 = {
            'x': 1,
            'y': 1
          };
          var map = [
            [
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.'
            ]
          ];

          socket.setOnMessage(function (e) {
            //console.log(JSON.parse(e.data))
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player1.x, player1.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              if (flag) {
                flag = false;
                assert.equal('ok', data.result, 'put player1');
                socket.putPlayer(player2.x, player2.y, {}, [], {}, userData.sid);

              } else {
                assert.equal('badPlacing', data.result, 'put player2');
                player2.id = data.id;
                socket.singleExamine(player2.id, userData.sid);
              }
              break;

            case 'examine':
              assert.equal('badId', data.result, 'examine request');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

      });

      describe('Move Player', function () {
        beforeEach(runBeforeEach);

        it('should fail move [out of map]', function (done) {
          var tick = null;
          var player = {
            'x': 0.5,
            'y': 0.5
          };
          var map = [['.']];
          this.timeout(10000);

          socket.setOnMessage(function (e) {
            //console.log(JSON.parse(e.data))
            var data = JSON.parse(e.data);
            if (data.tick) {
              tick = data.tick;
            }

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;

              setTimeout(function () {
                socket.move('east', tick, player.sid);
              }, 5000);
              break;

            case 'move':
              assert.equal('ok', data.result, 'move request');

              setTimeout(function () {
                socket.singleExamine(player.id, player.sid);
              }, 200);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(player.x, data.x, 'east: equal coordinate by x');
              assert.equal(player.y, data.y, 'east: equal coordinate by y');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should successfully move in all directions', function (done) {
          var dirs = [
            'west',
            'east',
            'north',
            'south'
          ];
          var counter = 0;
          var tick, tick1, tick2;
          var player = {
            'x': 1.5,
            'y': 1.5
          };
          var map = [
            [
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.'
            ]
          ];
          this.timeout(15000);

          socket.setOnMessage(function (e) {
            //console.log(JSON.parse(e.data))
            var data = JSON.parse(e.data);
            if (data.tick) {
              tick = data.tick;
            }

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;

              setTimeout(function () {
                socket.move(dirs[counter], tick, player.sid);
              }, 5000);
              break;

            case 'move':
              assert.equal('ok', data.result, 'move request');

              setTimeout(function () {
                socket.singleExamine(player.id, player.sid);
              }, 200);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              var newCoor = shift(dirs[counter], player.x, player.y, consts.playerVelocity);
              assert.equal(true, Math.abs(newCoor.x - data.x) < 0.01, dirs[counter] + ': equal coordinate by x');
              assert.equal(true, Math.abs(newCoor.y - data.y) < 0.01, dirs[counter] + ': equal coordinate by y');
              player.x = data.x;
              player.y = data.y;
              if (++counter < dirs.length) {
                socket.move(dirs[counter], tick, player.sid);

              } else {
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should successfully move in all directions [collision with walls]', function (done) {
          var dirs = [
            'west',
            'east',
            'south',
            'north'
          ];
          var counter = 0;
          var tick = null;
          var player = {
            'x': 1.5,
            'y': 1.5
          };
          var map = [
            [
              '#',
              '#',
              '#'
            ],
            [
              '#',
              '.',
              '#'
            ],
            [
              '#',
              '#',
              '#'
            ]
          ];
          this.timeout(10000);

          socket.setOnMessage(function (e) {
            //console.log(JSON.parse(e.data))
            var data = JSON.parse(e.data);
            if (data.tick) {
              tick = data.tick;
            }

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;

              setTimeout(function () {
                socket.move(dirs[counter], tick, player.sid);
              }, 3000);
              break;

            case 'move':
              assert.equal('ok', data.result, 'move request');

              setTimeout(function () {
                socket.singleExamine(player.id, player.sid);
              }, 200);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(player.x, data.x, dirs[counter] + ': equal coordinate by x');
              assert.equal(player.y, data.y, dirs[counter] + ': equal coordinate by y');
              if (++counter < dirs.length) {
                socket.move(dirs[counter], tick, player.sid);

              } else {
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should successfully move in all directions [collision with another players]', function (done) {
          var dirs = [
            'west',
            'east',
            'south',
            'north'
          ];
          var counter = 0;
          var step = 0;
          var tick = null;
          var player = {
            'x': 1.5,
            'y': 1.5
          };
          var map = [
            [
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.'
            ]
          ];
          this.timeout(10000);

          socket.setOnMessage(function (e) {
            //console.log(JSON.parse(e.data))
            var data = JSON.parse(e.data);
            if (data.tick) {
              tick = data.tick;
            }

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              socket.putPlayer(player.x - 1, player.y, {}, [], {}, userData.sid);
              //west
              socket.putPlayer(player.x + 1, player.y, {}, [], {}, userData.sid);
              //east
              socket.putPlayer(player.x, player.y - 1, {}, [], {}, userData.sid);
              //north
              socket.putPlayer(player.x, player.y + 1, {}, [], {}, userData.sid);
              //south
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              if (counter === 0) {
                player.id = data.id;
                player.sid = data.sid;
              }
              if (counter === 4) {

                setTimeout(function () {
                  socket.move(dirs[step], tick, player.sid);
                }, 6000);
              }
              ++counter;
              break;

            case 'move':
              assert.equal('ok', data.result, 'move request');
              socket.singleExamine(player.id, player.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(player.x, data.x, dirs[step] + ': equal coordinate by x');
              assert.equal(player.y, data.y, dirs[step] + ': equal coordinate by y');
              if (++step < dirs.length) {
                socket.move(dirs[step], tick, player.sid);

              } else {
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should successfully move in all directions                 [collision with walls and another players]', function (done) {
          var dirs = [
            'west',
            'east',
            'north',
            'south'
          ];
          var counter = 0;
          var step = 0;
          var tick = null;
          var player = {
            'x': 1.5,
            'y': 1.5
          };
          var map = [
            [
              '.',
              '#',
              '.'
            ],
            [
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '#',
              '.'
            ]
          ];
          this.timeout(10000);

          socket.setOnMessage(function (e) {
            //console.log(JSON.parse(e.data))
            var data = JSON.parse(e.data);
            if (data.tick) {
              tick = data.tick;
            }

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              socket.putPlayer(player.x - 1, player.y, {}, [], {}, userData.sid);
              //west
              socket.putPlayer(player.x + 1, player.y, {}, [], {}, userData.sid);
              //east
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              if (counter === 0) {
                player.id = data.id;
                player.sid = data.sid;
              }
              if (counter === 2) {

                setTimeout(function () {
                  socket.move(dirs[step], tick, player.sid);
                }, 6000);
              }
              ++counter;
              break;

            case 'move':
              assert.equal('ok', data.result, 'move request');
              socket.singleExamine(player.id, player.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(player.x, data.x, dirs[step] + ': equal coordinate by x');
              assert.equal(player.y, data.y, dirs[step] + ': equal coordinate by y');
              if (++step < dirs.length) {
                socket.move(dirs[step], tick, player.sid);

              } else {
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should successfully move player[wall sliding(left, north)]', function (done) {
          var player = {
            x: 1.5 - 1 + consts.slideThreshold,
            y: 2.5
          };
          var tick = null;
          var map = [
            [
              '.',
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '#',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.',
              '.'
            ]
          ];
          this.timeout(15000);

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);
            if (data.tick) {
              tick = data.tick;
            }

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              player.fistId = data.fistId;

              setTimeout(function () {
                socket.move('north', tick, player.sid);
              }, 1000);
              break;

            case 'move':
              assert.equal('ok', data.result, 'move request');

              setTimeout(function () {
                socket.singleExamine(player.id, player.sid);
              }, 2000);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine');
              assert.equal(true, Math.abs(data.x - 0.5) < 0.01, 'diff coordinate x');
              assert.equal(true, Math.abs(data.y - (player.y - consts.playerVelocity)) < 0.01, 'diff coordinate y');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should successfully move player[wall sliding(right, north)]', function (done) {
          var player = {
            x: 1.5 + 1 - consts.slideThreshold,
            y: 2.5
          };
          var tick = null;
          var map = [
            [
              '.',
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '#',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.',
              '.'
            ]
          ];
          this.timeout(15000);

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);
            if (data.tick) {
              tick = data.tick;
            }

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              player.fistId = data.fistId;

              setTimeout(function () {
                socket.move('north', tick, player.sid);
              }, 1000);
              break;

            case 'move':
              assert.equal('ok', data.result, 'move request');

              setTimeout(function () {
                socket.singleExamine(player.id, player.sid);
              }, 2000);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine');
              assert.equal(true, Math.abs(data.x - 2.5) < 0.01, 'diff coordinate x');
              assert.equal(true, Math.abs(data.y - (player.y - consts.playerVelocity)) < 0.01, 'diff coordinate y');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should successfully move player[wall sliding(left, south)]', function (done) {
          var player = {
            x: 1.5 - 1 + consts.slideThreshold,
            y: 0.5
          };
          var tick = null;
          var map = [
            [
              '.',
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '#',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.',
              '.'
            ]
          ];
          this.timeout(15000);

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);
            if (data.tick) {
              tick = data.tick;
            }

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              player.fistId = data.fistId;

              setTimeout(function () {
                socket.move('south', tick, player.sid);
              }, 1000);
              break;

            case 'move':
              assert.equal('ok', data.result, 'move request');

              setTimeout(function () {
                socket.singleExamine(player.id, player.sid);
              }, 2000);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine');
              assert.equal(true, Math.abs(data.x - 0.5) < 0.01, 'diff coordinate x');
              assert.equal(true, Math.abs(data.y - (player.y + consts.playerVelocity)) < 0.01, 'diff coordinate y');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should successfully move player[wall sliding(right, south)]', function (done) {
          var player = {
            x: 1.5 + 1 - consts.slideThreshold,
            y: 0.5
          };
          var tick = null;
          var map = [
            [
              '.',
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '#',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.',
              '.'
            ]
          ];
          this.timeout(15000);

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);
            if (data.tick) {
              tick = data.tick;
            }

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              player.fistId = data.fistId;

              setTimeout(function () {
                socket.move('south', tick, player.sid);
              }, 1000);
              break;

            case 'move':
              assert.equal('ok', data.result, 'move request');

              setTimeout(function () {
                socket.singleExamine(player.id, player.sid);
              }, 2000);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine');
              assert.equal(true, Math.abs(data.x - 2.5) < 0.01, 'diff coordinate x');
              assert.equal(true, Math.abs(data.y - (player.y + consts.playerVelocity)) < 0.01, 'diff coordinate y');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should successfully move player[wall sliding(top, east)]', function (done) {
          var player = {
            x: 0.5,
            y: 1.5 - 1 + consts.slideThreshold
          };
          var tick = null;
          var map = [
            [
              '.',
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '#',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.',
              '.'
            ]
          ];
          this.timeout(15000);

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);
            if (data.tick) {
              tick = data.tick;
            }

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              player.fistId = data.fistId;

              setTimeout(function () {
                socket.move('east', tick, player.sid);
              }, 1000);
              break;

            case 'move':
              assert.equal('ok', data.result, 'move request');

              setTimeout(function () {
                socket.singleExamine(player.id, player.sid);
              }, 2000);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine');
              assert.equal(true, Math.abs(data.x - (player.x + consts.playerVelocity)) < 0.01, 'diff coordinate x');
              assert.equal(true, Math.abs(data.y - 0.5) < 0.01, 'diff coordinate y');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should successfully move player[wall sliding(bottom, east)]', function (done) {
          var player = {
            x: 0.5,
            y: 1.5 + 1 - consts.slideThreshold
          };
          var tick = null;
          var map = [
            [
              '.',
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '#',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.',
              '.'
            ]
          ];
          this.timeout(15000);

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);
            if (data.tick) {
              tick = data.tick;
            }

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              player.fistId = data.fistId;

              setTimeout(function () {
                socket.move('east', tick, player.sid);
              }, 1000);
              break;

            case 'move':
              assert.equal('ok', data.result, 'move request');

              setTimeout(function () {
                socket.singleExamine(player.id, player.sid);
              }, 2000);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine');
              assert.equal(true, Math.abs(data.x - (player.x + consts.playerVelocity)) < 0.01, 'diff coordinate x');
              assert.equal(true, Math.abs(data.y - 2.5) < 0.01, 'diff coordinate y');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should successfully move player[wall sliding(top, west)]', function (done) {
          var player = {
            x: 2.5,
            y: 1.5 - 1 + consts.slideThreshold
          };
          var tick = null;
          var map = [
            [
              '.',
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '#',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.',
              '.'
            ]
          ];
          this.timeout(15000);

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);
            if (data.tick) {
              tick = data.tick;
            }

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              player.fistId = data.fistId;

              setTimeout(function () {
                socket.move('west', tick, player.sid);
              }, 1000);
              break;

            case 'move':
              assert.equal('ok', data.result, 'move request');

              setTimeout(function () {
                socket.singleExamine(player.id, player.sid);
              }, 2000);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine');
              assert.equal(true, Math.abs(data.x - (player.x - consts.playerVelocity)) < 0.01, 'diff coordinate x');
              assert.equal(true, Math.abs(data.y - 0.5) < 0.01, 'diff coordinate y');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should successfully move player[wall sliding(bottom , west)]', function (done) {
          var player = {
            x: 2.5,
            y: 1.5 + 1 - consts.slideThreshold
          };
          var tick = null;
          var map = [
            [
              '.',
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '#',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.',
              '.'
            ],
            [
              '.',
              '.',
              '.',
              '.'
            ]
          ];
          this.timeout(15000);

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);
            if (data.tick) {
              tick = data.tick;
            }

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              player.fistId = data.fistId;

              setTimeout(function () {
                socket.move('west', tick, player.sid);
              }, 1000);
              break;

            case 'move':
              assert.equal('ok', data.result, 'move request');

              setTimeout(function () {
                socket.singleExamine(player.id, player.sid);
              }, 2000);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine');
              assert.equal(true, Math.abs(data.x - (player.x - consts.playerVelocity)) < 0.01, 'diff coordinate x');
              assert.equal(true, Math.abs(data.y - 2.5) < 0.01, 'diff coordinate y');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('should successfully move player in all directions[bound collision with walls]', function (done) {
          var originX = 1.5, originY = 1.5;
          var tick = null;
          var player = {
            x: originX,
            y: originY
          };
          var counter = 0;
          var dirs = [
            'north',
            'south',
            'west',
            'east',
            'south',
            'north',
            'east',
            'west'
          ];
          var map = [
            [
              '#',
              '.',
              '#'
            ],
            [
              '.',
              '.',
              '.'
            ],
            [
              '#',
              '.',
              '#'
            ]
          ];
          this.timeout(50000);

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);
            if (data.tick) {
              tick = data.tick;
            }

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              player.fistId = data.fistId;

              setTimeout(function () {
                socket.move(dirs[counter], tick, player.sid);
              }, 1000);
              break;

            case 'move':
              assert.equal('ok', data.result, 'move request');

              setTimeout(function () {
                socket.singleExamine(player.id, player.sid);
              }, 2000);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine');
              var newCoor = shift(dirs[counter], player.x, player.y, consts.playerVelocity);
              assert.equal(true, Math.abs(newCoor.x - data.x) < 0.01, dirs[counter] + ': equal coordinate by x');
              assert.equal(true, Math.abs(newCoor.y - data.y) < 0.01, dirs[counter] + ': equal coordinate by y');
              player.x = newCoor.x;
              player.y = newCoor.y;
              if (++counter < dirs.length) {
                socket.move(dirs[counter], tick, player.sid);

              } else {
                socket.setOnMessage(undefined);
                done();
              }
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        })  /*it("should successfully move player [south: slide effect]", function(done) {
                var tick = null
                var player = {"x": 1+consts.slideThreshold, "y": 0.5}
                var map = [
                    [".", ".", "."],
                    [".", "#", "."],
                    [".", ".", "."]
                ]
                socket.setOnMessage(function(e) {
                    //console.log(JSON.parse(e.data))
                    var data = JSON.parse(e.data)
                    if (data.tick) {
                        tick = data.tick
                    }
                    switch(data.action) {
                    case "setUpMap":
                        assert.equal("ok", data.result, "load map")
                        socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid)
                        break
                    case "putPlayer":
                        assert.equal("ok", data.result, "put player")
                        player.id = data.id
                        player.sid = data.sid
                        socket.move("south", tick, player.sid)
                        break
                    case "move":
                        assert.equal("ok", data.result, "move request")
                        socket.singleExamine(player.id, player.sid)
                        break
                    case "examine":
                        assert.equal("ok", data.result, "examine request")
                        assert.equal(0.5, data.x, "south: equal coordinate by x")
                        assert.equal(1.5, data.y, "south: equal coordinate by y")
                        socket.setOnMessage(undefined)
                        done()
                    }
                })
                socket.setUpMap({"action": "setUpMap", "map": map, "sid": userData.sid})
            })

            it("should successfully move player [north: slide effect]", function(done) {
                var tick = null
                var player = {"x": 1+consts.slideThreshold, "y": 2.5}
                var map = [
                    [".", ".", "."],
                    [".", "#", "."],
                    [".", ".", "."]
                ]
                socket.setOnMessage(function(e) {
                    //console.log(JSON.parse(e.data))
                    var data = JSON.parse(e.data)
                    if (data.tick) {
                        tick = data.tick
                    }
                    switch(data.action) {
                    case "setUpMap":
                        assert.equal("ok", data.result, "load map")
                        socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid)
                        break
                    case "putPlayer":
                        assert.equal("ok", data.result, "put player")
                        player.id = data.id
                        player.sid = data.sid
                        socket.move("north", tick, player.sid)
                        break
                    case "move":
                        assert.equal("ok", data.result, "move request")
                        socket.singleExamine(player.id, player.sid)
                        break
                    case "examine":
                        assert.equal("ok", data.result, "examine request")
                        assert.equal(0.5, data.x, "north: equal coordinate by x")
                        assert.equal(1.5, data.y, "north: equal coordinate by y")
                        socket.setOnMessage(undefined)
                        done()
                    }
                })
                socket.setUpMap({"action": "setUpMap", "map": map, "sid": userData.sid})
            })

            it("should successfully move player [east: slide effect]", function(done) {
                var tick = null
                var player = {"x": 0.5, "y": 1+consts.slideThreshold}
                var map = [
                    [".", ".", "."],
                    [".", "#", "."],
                    [".", ".", "."]
                ]
                socket.setOnMessage(function(e) {
                    //console.log(JSON.parse(e.data))
                    var data = JSON.parse(e.data)
                    if (data.tick) {
                        tick = data.tick
                    }
                    switch(data.action) {
                    case "setUpMap":
                        assert.equal("ok", data.result, "load map")
                        socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid)
                        break
                    case "putPlayer":
                        assert.equal("ok", data.result, "put player")
                        player.id = data.id
                        player.sid = data.sid
                        socket.move("east", tick, player.sid)
                        break
                    case "move":
                        assert.equal("ok", data.result, "move request")
                        socket.singleExamine(player.id, player.sid)
                        break
                    case "examine":
                        assert.equal("ok", data.result, "examine request")
                        assert.equal(1.5, data.x, "east: equal coordinate by x")
                        assert.equal(0.5, data.y, "east: equal coordinate by y")
                        socket.setOnMessage(undefined)
                        done()
                    }
                })
                socket.setUpMap({"action": "setUpMap", "map": map, "sid": userData.sid})
            })

            it("should successfully move player [west: slide effect]", function(done) {
                var tick = null
                var player = {"x": 2.5, "y": 1+consts.slideThreshold}
                var map = [
                    [".", ".", "."],
                    [".", "#", "."],
                    [".", ".", "."]
                ]
                socket.setOnMessage(function(e) {
                    //console.log(JSON.parse(e.data))
                    var data = JSON.parse(e.data)
                    if (data.tick) {
                        tick = data.tick
                    }
                    switch(data.action) {
                    case "setUpMap":
                        assert.equal("ok", data.result, "load map")
                        socket.putPlayer(player.x, player.y, {}, [], {}, userData.sid)
                        break
                    case "putPlayer":
                        assert.equal("ok", data.result, "put player")
                        player.id = data.id
                        player.sid = data.sid
                        socket.move("west", tick, player.sid)
                        break
                    case "move":
                        assert.equal("ok", data.result, "move request")
                        socket.singleExamine(player.id, player.sid)
                        break
                    case "examine":
                        assert.equal("ok", data.result, "examine request")
                        assert.equal(1.5, data.x, "west: equal coordinate by x")
                        assert.equal(0.5, data.y, "west: equal coordinate by y")
                        socket.setOnMessage(undefined)
                        done()
                    }
                })
                socket.setUpMap({"action": "setUpMap", "map": map, "sid": userData.sid})
            })*/;
      });

      describe('Attack Player', function () {
        beforeEach(runBeforeEach);

        it('player should fail attack itself', function (done) {
          var player = {
            'x': 1.5,
            'y': 1.5,
            'stats': {
              'HP': 100,
              'MAX_HP': 100
            },
            'slots': {},
            'inventory': []
          };
          var map = [
            [
              '#',
              '#',
              '#'
            ],
            [
              '#',
              '.',
              '#'
            ],
            [
              '#',
              '#',
              '#'
            ]
          ];

          socket.setOnMessage(function (e) {
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putPlayer(player.x, player.y, player.stats, player.inventory, player.slots, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              player.fistId = data.fistId;
              socket.use(player.fistId, player.sid, player.x, player.y);
            case 'use':
              assert.equal('ok', data.result, 'use request');
              socket.singleExamine(player.id, player.sid);
              break;

            case 'examine':
              assert.equal('ok', data.result, 'examine request');
              assert.equal(player.stats.HP, data.health, 'health hasn\'t changed');
              socket.setOnMessage(undefined);
              done();
            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('player should attack mob                 [mob hasn\'t CAN_BLOW & HATE_PLAYER]', function (done) {
          var mob = {
            'x': 1.5,
            'y': 0.5,
            'race': 'TROLL',
            'stats': {
              'HP': 1000,
              'MAX_HP': 1000
            },
            'flags': [],
            'inventory': []
          };
          var player = {
            'x': 2.5,
            'y': 0.5,
            'stats': {
              'HP': 1000,
              'MAX_HP': 1000
            },
            'slots': {},
            'inventory': []
          };
          var map = [[
              '#',
              '.',
              '.',
              '#'
            ]];
          this.timeout(10000);

          socket.setOnMessage(function (e) {
            //console.log(JSON.parse(e.data))
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putMob(mob.x, mob.y, mob.stats, mob.inventory, mob.flags, mob.race, defaultDamage, userData.sid);
              break;

            case 'putMob':
              assert.equal('ok', data.result, 'put mob');
              mob.id = data.id;
              socket.putPlayer(player.x, player.y, player.stats, player.inventory, player.slots, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              player.fistId = data.fistId;
              socket.use(data.fistId, player.sid, mob.x, mob.y);
              break;

            case 'use':
              assert.equal('ok', data.result, 'use fists');

              setTimeout(function () {
                socket.singleExamine(player.id, player.sid);
              }, 2000);
              break;

            case 'examine':
              if (data.type === 'player') {
                flag = false;
                assert.equal('ok', data.result, 'player: examine request');
                assert.equal(player.stats.HP, data.health, 'player: health changed');

                setTimeout(function () {
                  socket.singleExamine(mob.id, userData.sid);
                }, 2000);

              } else if (data.type === 'monster') {
                assert.equal('ok', data.result, 'mob: examine request');
                assert.notEqual(mob.stats.HP, data.health, 'mob: health hasn\'t changed');
                assert.isTrue(mob.stats.HP > data.health, 'mob: health has decreased');
                socket.setOnMessage(undefined);
                done();
              }
              break;

            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('player should attack mob                 [mob has CAN_BLOW & HATE_PLAYER]', function (done) {
          var flag = true;
          var mob = {
            'x': 1.5,
            'y': 0.5,
            'race': 'TROLL',
            'stats': {
              'HP': 1000,
              'MAX_HP': 1000
            },
            'flags': [
              'CAN_BLOW',
              'HATE_PLAYER'
            ],
            'inventory': []
          };
          var player = {
            'x': 2.5,
            'y': 0.5,
            'stats': {
              'HP': 1000,
              'MAX_HP': 1000
            },
            'slots': {},
            'inventory': []
          };
          var map = [[
              '#',
              '.',
              '.',
              '#'
            ]];
          this.timeout(10000);

          socket.setOnMessage(function (e) {
            //console.log(JSON.parse(e.data))
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putMob(mob.x, mob.y, mob.stats, mob.inventory, mob.flags, mob.race, defaultDamage, userData.sid);
              break;

            case 'putMob':
              assert.equal('ok', data.result, 'put mob');
              mob.id = data.id;
              socket.putPlayer(player.x, player.y, player.stats, player.inventory, player.slots, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              player.fistId = data.fistId;
              socket.use(player.fistId, player.sid, mob.x, mob.y);
              break;

            case 'use':
              assert.equal('ok', data.result, 'use fists');

              setTimeout(function () {
                socket.singleExamine(mob.id, userData.sid);
              }, 2000);
              break;

            case 'examine':
              if (data.type === 'player') {
                flag = false;
                assert.equal('ok', data.result, 'player: examine request');
                assert.notEqual(player.stats.HP, data.health, 'player: health has changed');
                socket.setOnMessage(undefined);
                done();

              } else if (data.type === 'monster') {
                assert.equal('ok', data.result, 'mob: examine request');
                assert.notEqual(mob.stats.HP, data.health, 'mob: health has changed');

                setTimeout(function () {
                  socket.singleExamine(player.id, player.sid);
                }, 2000);
              }
              break;

            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

        });

        it('player shouldn\'t attack mob [too far apart]', function (done) {
          var flag = true;
          var mob = {
            'x': 0.5,
            'y': 0.5,
            'race': 'TROLL',
            'stats': {
              'HP': 100,
              'MAX_HP': 100
            },
            'flags': [
              'CAN_BLOW',
              'HATE_PLAYER'
            ],
            'inventory': []
          };
          var player = {
            'x': 9.5,
            'y': 0.5,
            'stats': {
              'HP': 100,
              'MAX_HP': 100
            },
            'slots': {},
            'inventory': []
          };
          var map = [[
              '.',
              '.',
              '.',
              '.',
              '.',
              '.',
              '.',
              '.',
              '.',
              '.'
            ]];

          socket.setOnMessage(function (e) {
            //console.log(JSON.parse(e.data))
            var data = JSON.parse(e.data);

            switch (data.action) {
            case 'setUpMap':
              assert.equal('ok', data.result, 'load map');
              socket.putMob(mob.x, mob.y, mob.stats, mob.inventory, mob.flags, mob.race, defaultDamage, userData.sid);
              break;

            case 'putMob':
              assert.equal('ok', data.result, 'put mob');
              mob.id = data.id;
              socket.putPlayer(player.x, player.y, player.stats, player.inventory, player.slots, userData.sid);
              break;

            case 'putPlayer':
              assert.equal('ok', data.result, 'put player');
              player.id = data.id;
              player.sid = data.sid;
              player.fistId = data.fistId;
              socket.use(player.fistId, player.sid, mob.x, mob.y);
              break;

            case 'use':
              assert.equal('ok', data.result, 'use fists');

              setTimeout(function () {
                socket.singleExamine(player.id, player.sid);
              }, 500);
            case 'examine':
              if (data.type === 'player') {
                flag = false;
                assert.equal('ok', data.result, 'player: examine request');
                assert.equal(player.stats.HP, data.health, 'player: health hasn\'t changed');

                setTimeout(function () {
                  socket.singleExamine(mob.id, userData.sid);
                }, 500);

              } else if (data.type === 'monster') {
                assert.equal('ok', data.result, 'mob: examine request');
                assert.equal(mob.stats.HP, data.health, 'mob: health hasn\'t changed');
                socket.setOnMessage(undefined);
                done();
              }
              break;

            }
          });

          socket.setUpMap({
            'action': 'setUpMap',
            'map': map,
            'sid': userData.sid
          });

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

  function shift(dir, x_, y_, val) {
    var x = x_;
    var y = y_;

    switch (dir) {
    case 'west':
      x -= val;
      break;

    case 'east':
      x += val;
      break;

    case 'north':
      y -= val;
      break;

    case 'south':
      y += val;
      break;

    }

    return {
      'x': x,
      'y': y
    };
  }

  return { run: testPlayers };
});
