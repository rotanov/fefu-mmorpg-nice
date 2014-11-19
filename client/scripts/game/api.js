define([
  'utils',
  'lib/bluebird'

], function (utils, bird) {

//  TODO: Queue requests and batch multiple requests into one message
//  See http://tavendo.com/blog/post/dissecting-websocket-overhead/ for more
//  details

  var serverAddress_ = 'http://localhost:6543';
  var sid_;
  var tickHandler_;
  var socket;
  var resolvers = {};

  function getServerAddress() {
    return serverAddress_;
  }

  function setServerAddress(serverAddress) {
    serverAddress_ = serverAddress;
  }

  function setTickHandler(tickHandler) {
    tickHandler_ = tickHandler;
  }

  function sendWS(message) {
    return new Promise(function (resolve, reject) {
      var action = message.action;
      utils.assert(action !== undefined);
      message.sid = sid_;
      if (resolvers[action] === undefined) {
        resolvers[action] = [];
      }
      resolvers[action].push(resolve);
      socket.send(JSON.stringify(message));
    });
  }

  function sendPOST(message) {
    return new Promise(function (resolve, reject) {
      var oReq = new XMLHttpRequest();
      oReq.open('POST', serverAddress_);
      oReq.responseType = 'json';

      oReq.onreadystatechange = function () {
        if (oReq.readyState === 4) {
          utils.assert(oReq.status === 200);
          resolve(oReq.response);
        }
      };

      oReq.send(JSON.stringify(message));
    });
  }

  /* POST */

  function login(login, password) {
    return sendPOST({
      action: 'login',
      login: login,
      password: password
    });
  }

  // class is a reserved word, so
  function register(login, password, heroType) {
    return sendPOST({
      action: 'register',
      login: login,
      password: password,
      'class': heroType
    });
  }

  /*Game Interaction*/

  function singleExamine(id) {
    return sendWS({
      action: 'examine',
      id: parseInt(id)
    });
  }

  function mapCellExamine(x, y) {
    return sendWS({
      action: 'examine',
      x: x,
      y: y
    });
  }

  function multipleIdExamine(ids) {
    return sendWS({
      action: 'examine',
      ids: ids
    });
  }

  function look() {
    return sendWS({
      action: 'look'
    });
  }

  function beginMove(direction, tick) {
    return sendWS({
      action: 'beginMove',
      direction: direction,
      tick: tick
    });
  }

  function endMove(direction, tick) {
    return sendWS({
      action: 'endMove',
      direction: direction,
      tick: tick
    });
  }

  function getDictionary() {
    return sendWS({
      action: 'getDictionary'
    });
  }

  function logout() {
    var cleanUp = function () {
      sid_ = undefined;
      tickHandler_ = undefined;
      resolvers = {};
      if (socket !== undefined) {
        socket.close();
      }
    }

    if (sid_ !== undefined) {
      return sendWS({action: 'logout'})
      .then(cleanUp);
    } else {
      return sendPOST({
        action: 'logout',
        sid: sid_
      })
      .then(cleanUp);
    }
  }

  function destroyItem(id) {
    return sendWS({
      action: 'destroyItem',
      id: parseInt(id)
    });
  }

  function drop(id) {
    return sendWS({
      action: 'drop',
      id: parseInt(id)
    });
  }

  function equip(id, slot) {
    return sendWS({
      action: 'equip',
      id: parseInt(id),
      slot: slot
    });
  }

  function unequip(slot) {
    return sendWS({
      action: 'unequip',
      slot: slot
    });
  }

  function pickUp(id) {
    return sendWS({
      action: 'pickUp',
      id: parseInt(id)
    });
  }

  function use(id, x, y) {
    var request = {
      action: 'use',
      id: parseInt(id)
    };
    if (x && y) {
      request.x = x;
      request.y = y;
    }
    return sendWS(request);
  }

  function useSkill(x, y) {
    return sendWS({
      action: 'useSkill',
      x: x,
      y: y
    });
  }

  /*Testing*/

  function startTesting() {
    return sendWS({
      action: 'startTesting'
    });
  }

  function stopTesting() {
    return sendWS({
      action: 'stopTesting'
    });
  }

  function getDictionary() {
    return sendWS({
      action: 'getDictionary'
    });
  }

  function setUpMap(data) {
    return sendWS(data);
  }

  function getConst() {
    return sendWS({
      action: 'getConst'
    });
  }

  function setUpConst(data) {
    return sendWS(data);
  }

  function putItem(x, y, item) {
    return sendWS({
      action: 'putItem',
      x: x,
      y: y,
      item: item
    });
  }

  function putMob(x, y, stats, inventory, flags, race, dealtDamage) {
    return sendWS({
      action: 'putMob',
      x: x,
      y: y,
      stats: stats,
      inventory: inventory,
      flags: flags,
      race: race,
      dealtDamage: dealtDamage
    });
  }

  function putPlayer(x, y, stats, inventory, slots) {
    return sendWS({
      action: 'putPlayer',
      x: x,
      y: y,
      stats: stats,
      inventory: inventory,
      slots: slots
    });
  }

  function enforce(object) {
    return sendWS({
      action: 'enforce',
      enforcedAction: object
    });
  }

  function connect(wsuri, sid) {
    return new Promise(function (resolve, reject) {
      utils.assert(sid_ === undefined);
      sid_ = sid;

      socket = new WebSocket(wsuri);

      socket.onmessage = function (event) {
        var data = JSON.parse(event.data);

        if (data.tick !== undefined) {
          if (tickHandler_ !== undefined) {
            tickHandler_(data);
          }

        } else {
          if (data.result !== 'ok') {
            utils.reportError(event.data);
          }

          var queue = resolvers[data.action];
          if (queue !== undefined && queue.length != 0) {
            var resolve = queue.shift();
            resolve(data);
          }
        }
      };

      socket.onopen = function (event) {
        resolve();
      };

      socket.onclose = function (event) {
        if (event.wasClean) {
          console.log('Connection closed.');

        } else {
          console.log('Connection is lost.');
        }
        console.log('[Code: ' + event.code + ', reason: ' + event.reason + ']');
        socket = undefined;
      };
    });
  }

  return {
    getServerAddress: getServerAddress,
    setServerAddress: setServerAddress,
    connect: connect,
    setTickHandler: setTickHandler,
    // API
    register: register,
    login: login,
    singleExamine: singleExamine,
    mapCellExamine: mapCellExamine,
    multipleIdExamine: multipleIdExamine,
    look: look,
    beginMove: beginMove,
    endMove: endMove,
    getDictionary: getDictionary,
    logout: logout,
    destroyItem: destroyItem,
    drop: drop,
    equip: equip,
    unequip: unequip,
    pickUp: pickUp,
    use: use,
    useSkill: useSkill,
    startTesting: startTesting,
    stopTesting: stopTesting,
    getDictionary: getDictionary,
    setUpMap: setUpMap,
    getConst: getConst,
    setUpConst: setUpConst,
    putItem: putItem,
    putMob: putMob,
    putPlayer: putPlayer,
    enforce: enforce
  };
});
