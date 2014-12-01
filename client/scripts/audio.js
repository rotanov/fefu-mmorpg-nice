'use strict';

define([
  'lib/bluebird'

], function(Promise) {

  var context;
  var masterGainNode;
  var muted = false;
  var audio = {};
  var buffers = {};
  var sources = {};

  audio.isMuted = function () {
    return muted;
  }

  audio.mute = function () {
    masterGainNode.gain.value = 0;
    muted = true;
  }

  audio.unmute = function () {
    masterGainNode.gain.value = 1;
    muted = false;
  }

  audio.init = function () {
    context = new window.AudioContext();
    var c = context;

    masterGainNode = c.createGain();
    masterGainNode.connect(c.destination);
  }

  audio.loadSoundFile = function (url, name) {
    if (buffers[name] !== undefined) {
      return;
    }

    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function(e) {
        context.decodeAudioData(this.response, function(decodedArrayBuffer) {
          buffers[name] = decodedArrayBuffer;
          sources[name] = [];
          resolve(/*?*/);
        }, function(e) {
          reject(e);
        });
      };
      xhr.send();
    });
  };

  audio.play = function(name, options) {
    options = options || {};
    var volume = options.volume || 1.0;
    var delay = options.delay || 0;
    var loop = options.loop || false;

    var s = context.createBufferSource();
    sources[name].push(s);
    s.buffer = buffers[name];
    s.loop = loop;
    s.name = name;

    var gainNode = context.createGain();
    gainNode.gain.value = volume;
    s.gainNode = gainNode;

    s.connect(gainNode);
    if (delay !== 0) {
      s.delayNode = context.createDelay();
      s.delayNode.delayTime.value = delay;
      s.connect(s.delayNode);
      s.delayNode.connect(s.delayNode);
      s.delayNode.connect(gainNode);
    }
    gainNode.connect(masterGainNode);

    s.setVolume = function (volume) {
      s.gainNode.gain.value = volume;
    }

    s.terminate = function () {
      s.stop();
      s.disconnect(s.delayNode);
      s.delayNode.disconnect(s.gainNode);
      s.gainNode.disconnect(masterGainNode);
      var sa = sources[s.name];
      sa.splice(sa.indexOf(s), 1);
    }

    s.start();
    return s;
  }
  return audio;
});