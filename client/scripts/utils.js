'use strict';

define([
  'minified'

], function (mini) {
  var $ = mini.$;
  var $$ = mini.$$;
  var EE = mini.EE;

  function reportError(message) {
    var e = new Error(message);
    console.log("Error: ", message, e.stack);
    throw e;
  }

  function logError(message) {
    var e = new Error(message);
    console.log("Error: ", message, e.stack);
  }

  function assert(expression, message) {
    message = message || 'no detailed information available';
    if (!expression) {
      reportError("assertion failed: " + message);
    }
  }

  var rpgMsg = function (text) {
    var p = EE('p', {$overflow: 'hidden', '$white-space': 'nowrap'}, text);
    $('#message').add(p);
    $('#message').animate({scrollTop: $$('#message').scrollHeight}, 400);
    $(p).set({$width: '0px'})
    .animate({$width: '100%'}, 400);
  }

  return {
    reportError: reportError,
    logError: logError,
    assert: assert,
    rpgMsg: rpgMsg
  };
});
