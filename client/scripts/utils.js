define([], function () {

  function reportError(message) {
    console.log("Error: " + message);
    var e = new Error();
    console.log(e.stack);
    throw e;
  }

  function assert(expression) {
    if (!expression) {
      reportError("assertion failed");
    }
  }

  return {
    reportError: reportError,
    assert: assert
  };
});
