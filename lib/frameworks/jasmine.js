var q = require('q');

/**
 * Execute the Runner's test cases through Jasmine.
 *
 * @param {Runner} runner The current Protractor Runner.
 * @param {Array} specs Array of Directory Path Strings.
 * @return {q.Promise} Promise resolved with the test results
 */
exports.run = function(runner, specs) {
  var minijn = require('minijasminenode2');

  require('jasminewd');
  /* global jasmine */

  var testResult = [],
    failedCount = 0;

  var RunnerReporter = function(emitter) {
    this.emitter = emitter;
  };
  RunnerReporter.prototype.jasmineStarted = function() {
    // Need to initiate startTime here, in case reportSpecStarting is not
    // called (e.g. when iit is used)
    this.startTime = new Date();
  };
  RunnerReporter.prototype.specStarted = function() {
    this.startTime = new Date();
  };
  RunnerReporter.prototype.specDone = function(result) {
    if (result.status == 'passed') {
      this.emitter.emit('testPass');
    } else if (result.status == 'failed') {
      this.emitter.emit('testFail');
      failedCount++;
    }

    var entry = {
      description: result.description,
      assertions: [],
      duration: new Date().getTime() - this.startTime.getTime()
    };
    result.failedExpectations.forEach(function(item) {
      entry.assertions.push({
        passed: item.passed,
        errorMsg: item.passed ? undefined : item.message,
        stackTrace: item.passed ? undefined : item.stack
      });
    });
    testResult.push(entry);
  };

  // On timeout, the flow should be reset. This will prevent webdriver tasks
  // from overflowing into the next test and causing it to fail or timeout
  // as well. This is done in the reporter instead of an afterEach block
  // to ensure that it runs after any afterEach() blocks with webdriver tasks
  // get to complete first.
  jasmine.getEnv().addReporter(new RunnerReporter(runner));

  return runner.runTestPreparer().then(function() {
    return q.promise(function (resolve, reject) {
      var jasmineNodeOpts = runner.getConfig().jasmineNodeOpts;
      var originalOnComplete = runner.getConfig().onComplete;

      jasmineNodeOpts.onComplete = function(passed) {
        try {
          if (originalOnComplete) {
            originalOnComplete(passed);
          }
          resolve({
            failedCount: failedCount,
            specResults: testResult
          });
        } catch(err) {
          reject(err);
        }
      };

      minijn.addSpecs(specs);
      minijn.executeSpecs(jasmineNodeOpts);
    });
  });
};
