'use strict';

define([
  'lib/bluebird',
  'minified',
  'lib/pixi',
  'lib/stats',
  'audio',
  'utils',
  'game/api',
  'game/actor',
  'game/healthbar',
  'game/hero',
  'game/emitter'

], function (Promise, mini, pixi, stats, audio, utils, api, Actor, HealthBar, Hero, Emitter) {

  var rpgMsg = utils.rpgMsg;

  var $ = mini.$;
  var EE = mini.EE;
  var $$ = mini.$$;
  var running = false;
  var msg;
  var heroesBuffer = [];
  var heroesCount = 0;
  var actorsData = {};

  var columnCount = 9;
  var rowCount = 7;
  var step = 64;

  var gPlayerX;
  var gPlayerY;
  var gPlayerXPrev;
  var gPlayerYPrev;
  var id_;
  var tick_;
  var fistId;
  var inventory;
  var health;
  var lifespan = 1;
  var curr_slot = {
    'slot': null,
    'id': null
  };
  var fireBall = 283;

  var requestServerDataIntervalId;
  var animFrameId;
  var pixiStage
  // root render container
  var root;
  var fxLayerNear;
  var fxLayerFar;
  var healthBar;

  var bgMusic;
  var stepSound = undefined;

  var st = new Stats();

  function getActorById(id) {
    for (var i = 0; i < heroesCount; i++) {
      if (heroesBuffer[i].id === id) {
        return heroesBuffer[i];
      }
    }
    if (root.hero.id === id) {
      return root.hero;
    }

    return undefined;
  }

  function composeScene() {
    root = new pixi.Graphics();
    pixiStage.addChild(root);

    // draw background (grid)
    root.lineStyle(1, 0xFFFFFF, 0.1);
    for (var i = 1; i < columnCount; i++) {
      root.moveTo(i * step, 0.0);
      root.lineTo(i * step, step * rowCount);
    }

    for (var i = 1; i < rowCount; i++) {
      root.moveTo(0.0, i * step);
      root.lineTo(step * columnCount, i * step);
    }

    // level map cells
    var cells = [];
    var field = new pixi.Graphics();
    root.addChild(field);
    root.cells = cells;
    root.field = field;

    fxLayerFar = new pixi.DisplayObjectContainer();
    Emitter.setFxLayer(fxLayerFar);
    root.addChild(fxLayerFar);

    for (var i = 0; i < rowCount; i++) {
      for (var j = 0; j < columnCount; j++) {
        var c = new pixi.Graphics();
        c.beginFill(0xbedb39, 1.0);
        c.drawRect(j * step, i * step, step, step);
        c.endFill();
        field.addChild(c);
        cells[i * columnCount + j] = c;
      }
    }

    // setup heroes
    var hero = new Hero();
    root.addChild(hero);
    root.hero = hero;
    hero.position.set(288, 224);

    var emitter = new Emitter();
    hero.body.addChild(emitter);
    hero.trail = emitter;

    for (var i = 0; i < 256; i++) {
      var hero = new Hero();
      heroesBuffer.push(hero);
      hero.visible = false;
      root.addChild(hero);
    }

    fxLayerNear = new pixi.DisplayObjectContainer();
    root.addChild(fxLayerNear);

    // interface
    healthBar = new HealthBar();
    root.addChild(healthBar);
    healthBar.position.set(2, 2);
  }

  function requestLook() {
    var rttSample = window.performance.now();
    return api.look()
    .then(function (data) {
      st.pushRttSample(window.performance.now() - rttSample);
      utils.assert(data.result === 'ok');
      gPlayerXPrev = gPlayerX;
      gPlayerYPrev = gPlayerY;
      gPlayerX = data.x;
      gPlayerY = data.y;

      // attempt to stop step sound when we're not moving despite pressing move keys
      // but server collision resolution jitters player position wehn pressing to the wall
      var delta = Math.abs(gPlayerX - gPlayerXPrev) + Math.abs(gPlayerY - gPlayerYPrev);
      // console.log(delta);
      // if (delta === 0) {
      //   if (stepSound !== undefined) {
      //     stepSound.stop();
      //     stepSound = undefined;
      //   }
      // }
      if (root && root.hero) {
        root.hero.trail.emission = delta * 1000;
      }

      for (var i = 0; i < rowCount; i++) {
        for (var j = 0; j < columnCount; j++) {
          if (root !== undefined) {
            root.cells[i * columnCount + j].visible = data.map[i][j] === '#';
          }
        }
      }

      // actors[0].id = id_;
      // actors[0].name = 'player';
      // actors[0].x = coordinate(gPlayerX, gPlayerX, columnCount);
      // actors[0].y = coordinate(gPlayerY, gPlayerY, rowCount);
      // actors[0].visible = true;
      for (var i = 0; i < heroesBuffer.length; i++) {
        heroesBuffer[i].visible = false;
      }
      var l = Math.min(data.actors.length, heroesBuffer.length);
      var iSkip = 0;
      for (var i = 0; i < l; i++) {
        var a = data.actors[i];
        var h = heroesBuffer[i - iSkip];
          if (actorsData[a.id] === undefined) {
            actorsData[a.id] = {};
          }
        //actors[j].id = actor[i].id;
        //actors[j].name = actor[i].name;
        if (a.id === id_) {
          root.hero.setHealth(a.health, a.maxHealth);
          root.hero.setColor(0xffffff, a.class);
          root.hero.id = a.id;
          root.hero.setBoxSize(a.size);
          iSkip = 1;
          continue;
        }
        if (a.type === 'monster') {
          h.setHealth(a.health, a.maxHealth);
          h.setColor(0xfd7400, 'monster');
        }
        else if (a.type === 'player') {
          h.setColor(0xbedb39, a.class);
        }
        else if (a.type === 'item') {
          h.setColor(0xffe11a, 'item');
        }
        h.setBoxSize(a.size);
        h.id = a.id;
        actorsData[a.id].position = h.position;
        h.position.x = coordinate(gPlayerX, data.actors[i].x, columnCount);
        h.position.y = coordinate(gPlayerY, data.actors[i].y, rowCount);
        h.visible = true;
        heroesCount = i + 1;
        // actors[j].visible = true;
        // setProperties(actor[i], j);
      }

      // for (var i = j, l = actors.length; i < l; i++) {
      //   actors[i].visible = false;
      // }
    })
    .catch(function (data) {
      console.log(data, data.stack);
      location.href = api.getServerAddress();
    });
  }

  function requestServerData() {
    requestLook();
    requestExamine(id_);
  }

  function requestExamine(id) {
    return api.singleExamine(id)
    .then(function (data) {
      if (data.type === 'item') {
        object.showInf(data.item);

      } else {
        //object.showInf(data);
      }
      //updateSlot(data);
      if (data.id === id_) {
        inventory = data.inventory;
        healthBar.setHealth(data.health, data.maxHealth);
      }
    })
    .catch(function (data) {
      location.href = api.getServerAddress();
    });
  }

  function onTick(data) {
    tick_ = data.tick;

    if (data.events.length > 0) {
      console.log(JSON.stringify(data.events));
    }

    var events = data.events;
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      switch (e.event){
        case "attack":
          var target = getActorById(e.target);
          if (target !== undefined) {
            target.bleedFor(e.dealtDamage);
          }
        break;

        case "bonus":
          if (e.id === id_) {
            audio.play('coin', {volume: 0.5});
          }
        break;
      }
    }
  }

  function start(data) {
    return new Promise(function (resolve, reject) {
      id_ = data.id;
      fistId = data.fistId;

      api.setTickHandler(onTick);
      return api.connect()
      .then(function () {
        api.getConst()
        .then(function (data) {
          columnCount = data.screenColumnCount;
          rowCount = data.screenRowCount;
        });

        return requestLook()
        .then(function () {
          return startMore(data, resolve, reject);
        });
      });
    });
  }

  function startMore(data, resolve, reject) {
    Promise.join(
      audio.loadSoundFile('assets/526679_RR-Pac-Land-Theme.mp3', 'bg1'),
      audio.loadSoundFile('assets/footstep.wav', 'step'),
      audio.loadSoundFile('assets/attack.wav', 'attack'),
      audio.loadSoundFile('assets/coin.wav', 'coin'),
      function () {
        bgMusic = audio.play('bg1', {volume: 0.05, loop: true});
      }
    );

    pixiStage = new pixi.Stage(0x004358);

    var renderer = pixi.autoDetectRenderer(step * (columnCount - 1),
                                           step * (rowCount - 1),
                                           { antialias: true });
    //!? renderer.width = $('#game-screen').get('$width', true);

    st.domElement.style.left = 'calc(100vw - 96px)';
    st.domElement.style.top = '0px';
    st.domElement.style.position = 'absolute';
    $('#game-screen').add(st.domElement);

    composeScene();

    var ox = renderer.width * 0.5;
    var oy = renderer.height * 0.5;
    var angle = Math.PI / 4.0;

    animFrameId = requestAnimFrame(animate);
    function animate() {
      st.begin();

      root.field.position.set(-(gPlayerX * step % step),
                              -(gPlayerY * step % step));

      fxLayerFar.position.set(-((columnCount - 1) * 0.5 + gPlayerX) * step
                             ,-((rowCount - 1) * 0.5 + gPlayerY) * step);

      var dx = keys[39] - keys[37];
      var dy = keys[40] - keys[38];

      root.hero.setHeroDeltas(dx, dy);

      // root.hero.position.set(ox + dx * 5 + Math.sin(t*2) * 5 * dy,
                             // oy + dy * 5 + Math.sin(t*2) * 5 * -dx);
      root.hero.position.set(ox, oy);

      renderer.render(pixiStage);

      var actors = Actor.getActors();
      for (var i = 0; i < actors.length; i++) {
        if (actors[i].id !== undefined) {
          var id = actors[i].id;
          if (actorsData[id] && actorsData[id].position) {
            var odx = (actorsData[id].position.x - actors[i].position.x);
            var ody = (actorsData[id].position.y - actors[i].position.y);
            actors[i].setHeroDeltas(odx, ody);
          }
        }
        actors[i].update(1.0 / 60.0);
      }
      Actor.cleanUp();

      st.end();
      requestAnimFrame(animate);
    }

    // increasing requestServerData interval (e.g. to 500) allows us to see what is
    // displayed directly at server's coordinates and what is animated on client
    requestServerDataIntervalId = window.setInterval(requestServerData, 1000.0 / 60.0);

    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);

    var keys = {
      37: 0,
      38: 0,
      39: 0,
      40: 0
    };

    var keyToDirection = {
      37: 'west',
      38: 'north',
      39: 'east',
      40: 'south'
    };

    var changeStepSoundState = function () {
      var dx = keys[39] - keys[37];
      var dy = keys[40] - keys[38];
      if (dx !== 0 || dy !== 0) {
        if (stepSound === undefined) {
          stepSound = audio.play('step', {delay: 0.3});
        }
      } else if (stepSound !== undefined) {
        stepSound.terminate();
        stepSound = undefined;
      }
    }

    function onKeyDown(e) {
      if (keyToDirection[e.keyCode] !== undefined &&
          keys[e.keyCode] === 0) {
        api.beginMove(keyToDirection[e.keyCode], tick_);
      }
      keys[e.keyCode] = 1;
      changeStepSoundState();
    }

    function onKeyUp(e) {
      keys[e.keyCode] = 0;
      if (keyToDirection[e.keyCode] != undefined) {
        api.endMove(keyToDirection[e.keyCode], tick_);
      }
      changeStepSoundState();
      console.log(e.keyCode);

      // 90 is `z`
      if (e.keyCode === 90) {
        audio.play('attack', {volume: 0.2});
        var p = root.hero.getAttackPos();
        api.use(fistId, p.x + gPlayerX, p.y + gPlayerY)
        .then(function (data) {
        });
        root.hero.attack(p);
      }

      // 88 is 'x'
      if (e.keyCode === 88) {
        audio.play('attack', {volume: 0.2});
        var p = root.hero.getAttackPos();
        // -4 is `BOW_ID_`
        api.use(-4, p.x + gPlayerX, p.y + gPlayerY)
        .then(function (data) {
        });
        root.hero.attack(p);
      }
    }

    running = true;
    return resolve(renderer.view);
  }

  function coordinate(x, coord, g) {
    return (coord - x + (g - 1) * 0.5) * step;
  }

  function UnCoordinate(x, coord, g) {
    return coord / step - (g - 1) * 0.5 + x;
  }

  function stop() {
    running = false;
    window.clearInterval(requestServerDataIntervalId);
    requestServerDataIntervalId = undefined;
    cancelAnimationFrame(animFrameId);
    animFrameId = animFrameId;
    bgMusic.stop();
  }

  return {
    start: start,
    stop: stop,
    isRunning: function () {
      return running;
    }
  }
});
