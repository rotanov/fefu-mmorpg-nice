'use strict';

define([], function () {

  function reportError(message) {
    var e = new Error(message);
    console.log("Error: ", message, e.stack);
    throw e;
  }

  function logError(message) {
    var e = new Error(message);
    console.log("Error: ", message, e.stack);
  }

  function assert(expression) {
    if (!expression) {
      reportError("assertion failed");
    }
  }

  return {
    reportError: reportError,
    logError: logError,
    assert: assert
  };
});
