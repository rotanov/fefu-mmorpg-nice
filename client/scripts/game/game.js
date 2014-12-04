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

    fxLayerFar = new pixi.DisplayObjectContainer();
    Emitter.setFxLayer(fxLayerFar);

    // setup heroes
    var hero = new Hero();
    root.addChild(hero);
    root.hero = hero;
    hero.position.set(288, 224);

    var emitter = new Emitter({});
    hero.addChild(emitter);

    for (var i = 0; i < 256; i++) {
      var hero = new Hero();
      heroesBuffer.push(hero);
      hero.visible = false;
      root.addChild(hero);
    }

    root.addChild(fxLayerFar);
    fxLayerNear = new pixi.DisplayObjectContainer();
    root.addChild(fxLayerNear);

    // interface
    healthBar = new HealthBar();
    root.addChild(healthBar);
    healthBar.position.set(2, 2);

    // overlay border, covering half tile size
    // var border = new pixi.Graphics();
    // root.addChild(border);
    // border.beginFill(0x00FFFF, 0xFF);
    // border.drawRect(0, 0, step * columnCount, step / 2);
    // border.drawRect(0, step * rowCount - step / 2, step * columnCount, step / 2);
    // border.drawRect(0, 0, step / 2, step * rowCount);
    // border.drawRect(step * columnCount - step / 2, 0, step / 2, step * rowCount);
    // border.endFill();
  }

  function requestLook() {
    return api.look()
    .then(function (data) {
      utils.assert(data.result === 'ok');
      // gPlayerXPrev = gPlayerX;
      // gPlayerYPrev = gPlayerY;
      gPlayerX = data.x;
      gPlayerY = data.y;

      // attempt to stop step sound when we're not moving despite pressing move keys
      // but server collision resolution jitters player position wehn pressing to the wall
      // var delta = Math.abs(gPlayerX - gPlayerXPrev) + Math.abs(gPlayerY - gPlayerYPrev);
      // console.log(delta);
      // if (delta === 0) {
      //   if (stepSound !== undefined) {
      //     stepSound.stop();
      //     stepSound = undefined;
      //   }
      // }

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
        //actors[j].id = actor[i].id;
        //actors[j].name = actor[i].name;
        if (a.id === id_) {
          root.hero.setHealth(a.health, a.maxHealth);
          root.hero.setColor(0xffffff, a.class);
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
          h.setColor(0x1f8a70, 'item');
        }
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
      console.log(data);
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

    try {
    if (data.events !== undefined
        && data.events.length !== 0) {
      utils.rpgMsg(JSON.stringify(data.events));
    }
    }
    catch (e) {
      console.log(e);
    }
    // for (var i = 0, l = data.events.length; i < l; ++i) {
    //   if (data.events[i].attaker !== id_) {
    //     curr_h -= data.events[i].dealtDamage; // NO
    //   }
    // }
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

    var st = new Stats();
    st.setMode(0);
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
        actors[i].update(1.0 / 60.0);
      }

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

      if (e.keyCode === 90) {
        audio.play('attack', {volume: 0.2});

          var p = root.hero.lastDir;
          api.use(fistId, p.x + gPlayerX, p.y + gPlayerY)
          .then(function (data) {
          });

          // p.x -= (columnCount - 1) * 0.5;
          // p.y -= (rowCount - 1) * 0.5;
          // var emitter = new Emitter({position: p,
          //   angle: Math.PI / 2});
          // hero.addChild(emitter);
      }
    }

    running = true;
    return resolve(renderer.view);
  }
//   function onCreate() {

//     createActors(5);


//     msg = game.add.text(32, 380, '', {
//       font: '30pt Courier',
//       fill: '#19cb65',
//       stroke: '#119f4e',
//       strokeThickness: 2
//     });

//   }

  function updateSlot(data) {
    if (data.id !== curr_slot.id) {
      return;
    }
    $('div#' + curr_slot.slot).text(data.item.name);
    $('div#' + curr_slot.slot).val(data.id);
  }

//   function onUpdate() {

//     if (game.input.mousePointer.isDown) {
//       var x = game.input.x;
//       var y = game.input.y;
//       var x1 = UnCoordinate(gPlayerX, x, columnCount);
//       var y1 = UnCoordinate(gPlayerY, y, rowCount);
//       if (lifespan) {
//         if (zKey.isDown) {
//           socket.use(fistId, sid_, x1, y1);

//         } else if (xKey.isDown) {
//           socket.useSkill(sid_, x1, y1);
//         }
//       }
//       var data = getObgect();
//       if (data.id && lifespan) {
//         if (aKey.isDown) {
//           socket.pickUp(data.id, sid_);
//   .then requestExamine(id_);
//         } else {
//           socket.singleExamine(data.id, sid_);
//         }
//       }
//     }

//     if (lifespan) {
//       socket.look(sid_);
//     }
//   }

  function coordinate(x, coord, g) {
    return (coord - x + (g - 1) * 0.5) * step;
  }

  function UnCoordinate(x, coord, g) {
    return coord / step - (g - 1) * 0.5 + x;
  }

//   function createActors(start) {
//     var frameIndex = 31;
//     var length = columnCount * rowCount * (start + 1);
//     for (var i = start; i < length; i++) {
//       var x = coordinate(gPlayerX, 0, columnCount);
//       var y = coordinate(gPlayerY, 0, rowCount);
//       var sprite = game.add.sprite(x, y, 'tileset', frameIndex);
//       sprite.anchor.setTo(0.5, 0.5);
//       sprite.inputEnabled = true;
//       actors.push(sprite);
//     }
//   }

//   function getObgect() {
//     for (var i = 0, l = actors.length; i < l; i++) {
//       if (phaser.Rectangle.contains(actors[i].body, game.input.x, game.input.y)) {

//         return actors[i];
//       }
//     }

//     return 0;
//   }

  function pushItem(id, name) {
    $('#items select#items').append('<option value=\'' + id + '\'>' + name + '</option>');
  }

  // $('#reload').click(function () {
  //   $('#items select').empty();
  //   for (var i = 0, l = inventory.length; i < l; ++i) {
  //     pushItem(inventory[i].id, inventory[i].name);
  //   }
  // });

  // $('#logout').click(function () {
  //   game.destroy();
  // });

  // $('#use').click(function () {
  //   var id = $('#items select#items').find(':selected').val();
  //   api.use(id)
  //   .then(function (data) {
  //     $('#msg').text(data.message);
  //   });
  // });

  // $('#destroyItem').click(function () {
  //   var id = $('#items select#items').find(':selected').val();
  //   $('#items select#items').find(':selected').remove();
  //   api.destroyItem(id);
  // });

  // $('#drop').click(function (id) {
  //   var id = $('#items select#items').find(':selected').val();
  //   $('#items select#items').find(':selected').remove();
  //   api.drop(id);
  // });

  // $('#ok').click(function () {
  //   $('#slots').hide();
  //   var id = $('#items select#items').find(':selected').val();
  //   var slot = $('input:radio[name=slot]:checked').val();
  //   if (slot !== undefined) {
  //     api.equip(id, slot)
  //     .then(function (data) {
  //       requestExamine(id);
  //     });
  //   }
  //   curr_slot.slot = slot;
  //   curr_slot.id = id;
  //   console.log(curr_slot);
  // });

  // $('#close').click(function () {
  //   $('#slots').hide();
  // });

  // $('#reset').click(function () {
  //   $('input:radio[name=slot]').attr('checked', false);
  // });

  // $('#equip').click(function () {
  //   $('#slots').show();
  // });

  // $('#unequip').click(function () {
  //   var slot = $('#p-slots input:radio[name=slot]:checked', '').val();
  //   if (slot !== undefined) {
  //     $('div#' + slot).text('');
  //     api.unequip(slot);
  //   }
  // });

  // $('#items select').on('change', function (e) {
  //   var optionSelected = $('option:selected', this);
  //   var id = this.value;
  //   requestExamine(id);
  // });

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
