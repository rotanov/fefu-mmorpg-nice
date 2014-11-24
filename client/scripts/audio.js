'use strict';

define([], function() {

  var context;
  var buffer;
  var source;
  var destination;

  function init() {
    context = new window.AudioContext();
  }

  var loadSoundFile = function(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(e) {
      context.decodeAudioData(this.response,
      function(decodedArrayBuffer) {
        buffer = decodedArrayBuffer;
        play();
      }, function(e) {
        console.log('Error decoding file', e);
      });
    };
    xhr.send();
  };

  var play = function(){
    source = context.createBufferSource();
    source.loop = true;
    source.buffer = buffer;
    destination = context.destination;
    source.connect(destination);
    source.start(0);
  }

  var stop = function(){
    source.stop(0);
  }

  return {
    init: init,
    loadSoundFile: loadSoundFile,
    play: play,
    stop: stop
  };
});