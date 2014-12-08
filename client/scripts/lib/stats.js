/**
 * @author mrdoob / http://mrdoob.com/
 */

var Stats = function () {

  var startTime = Date.now(), prevTime = startTime;
  var ms = 0, msMin = Infinity, msMax = 0;
  var fps = 0, fpsMin = Infinity, fpsMax = 0;
  var rtt = 0, rttMin = Infinity, rttMax = 0;
  var frames = 0;

  var container = document.createElement( 'div' );
  container.id = 'stats';
  container.style.cssText = 'width:80px;opacity:0.9;cursor:pointer';

  var fpsDiv = document.createElement( 'div' );
  fpsDiv.id = 'fps';
  fpsDiv.style.cssText = 'padding:0 0 3px 3px;text-align:left;background-color:#002';
  container.appendChild( fpsDiv );

  var fpsText = document.createElement( 'div' );
  fpsText.id = 'fpsText';
  fpsText.style.cssText = 'color:#0ff;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px';
  fpsText.innerHTML = 'FPS';
  fpsDiv.appendChild( fpsText );

  var fpsGraph = document.createElement( 'div' );
  fpsGraph.id = 'fpsGraph';
  fpsGraph.style.cssText = 'position:relative;width:74px;height:30px;background-color:#0ff';
  fpsDiv.appendChild( fpsGraph );

  while ( fpsGraph.children.length < 74 ) {

    var bar = document.createElement( 'span' );
    bar.style.cssText = 'width:1px;height:30px;float:left;background-color:#113';
    fpsGraph.appendChild( bar );

  }

  var msDiv = document.createElement( 'div' );
  msDiv.id = 'ms';
  msDiv.style.cssText = 'padding:0 0 3px 3px;text-align:left;background-color:#020;';
  container.appendChild( msDiv );

  var msText = document.createElement( 'div' );
  msText.id = 'msText';
  msText.style.cssText = 'color:#0f0;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px';
  msText.innerHTML = 'MS';
  msDiv.appendChild( msText );

  var msGraph = document.createElement( 'div' );
  msGraph.id = 'msGraph';
  msGraph.style.cssText = 'position:relative;width:74px;height:30px;background-color:#0f0';
  msDiv.appendChild( msGraph );

  while ( msGraph.children.length < 74 ) {

    var bar = document.createElement( 'span' );
    bar.style.cssText = 'width:1px;height:30px;float:left;background-color:#131';
    msGraph.appendChild( bar );

  }

  var rttDiv = document.createElement( 'div' );
  rttDiv.id = 'rtt';
  rttDiv.style.cssText = 'padding:0 0 3px 3px;text-align:left;background-color:#200;';
  container.appendChild( rttDiv );

  rttText = document.createElement( 'div' );
  rttText.id = 'rttText';
  rttText.style.cssText = 'color:#f00;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px';
  rttText.innerHTML = 'Round Trip Time';
  rttDiv.appendChild(rttText);

  var rttGraph = document.createElement( 'div' );
  rttGraph.id = 'rttGraph';
  rttGraph.style.cssText = 'position:relative;width:74px;height:30px;background-color:#f00';
  rttDiv.appendChild( rttGraph );

  while ( rttGraph.children.length < 74 ) {

    var bar = document.createElement( 'span' );
    bar.style.cssText = 'width:1px;height:30px;float:left;background-color:#311';
    rttGraph.appendChild( bar );

  }

  var updateGraph = function ( dom, value ) {

    var child = dom.appendChild( dom.firstChild );
    child.style.height = value + 'px';

  };

  return {

    REVISION: 12,

    domElement: container,

    begin: function () {

      startTime = Date.now();

    },

    end: function () {

      var time = Date.now();

      ms = time - startTime;
      msMin = Math.min( msMin, ms );
      msMax = Math.max( msMax, ms );

      msText.textContent = ms + ' MS (' + msMin + '-' + msMax + ')';
      updateGraph( msGraph, Math.min( 30, 30 - ( ms / 200 ) * 30 ) );

      frames ++;

      if ( time > prevTime + 1000 ) {

        rttMin = Math.min( rttMin, rtt );
        rttMax = Math.max( rttMax, rtt );
        rttText.textContent = 'RTT: ' + Math.round(rtt) + 'ms (' +
          Math.round(rttMin) + '-' + Math.round(rttMax) + ')';
        updateGraph( rttGraph, Math.min( 30, 30 - (rtt / 200) * 30 ) );

        fps = Math.round( ( frames * 1000 ) / ( time - prevTime ) );
        fpsMin = Math.min( fpsMin, fps );
        fpsMax = Math.max( fpsMax, fps );

        fpsText.textContent = fps + ' FPS (' + fpsMin + '-' + fpsMax + ')';
        updateGraph( fpsGraph, Math.min( 30, 30 - ( fps / 100 ) * 30 ) );

        prevTime = time;
        frames = 0;

      }

      return time;

    },

    update: function () {

      startTime = this.end();

    },

    pushRttSample: function (rttSample) {
      rtt = (0.5 * rtt) + (1.0 - 0.5) * rttSample;
    }

  }

};

if ( typeof module === 'object' ) {

  module.exports = Stats;

}