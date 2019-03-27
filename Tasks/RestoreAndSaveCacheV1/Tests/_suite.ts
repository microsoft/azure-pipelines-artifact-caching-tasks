import * as path from "path";
import * as assert from "assert";
import * as ttm from "azure-pipelines-task-lib/mock-test";

describe("restore cache tests", function() {
  before(function() {
    this.timeout(1000);
  });

  after(() => {});

  it("RestoreCache runs successfully with warnings if no key files are found", function(done: MochaDone) {
    let tp = path.join(__dirname, "RestoreCacheNoKeyFiles.js");
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();
    console.log(tr.succeeded);
    console.log(tr.stdout);
    assert.equal(tr.succeeded, true, "should have succeeded");
    assert.equal(
      tr.warningIssues.length > 0,
      true,
      "should have warnings from key file"
    );
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    assert.equal(
      tr.stdout.indexOf("no key files matching:") >= 0,
      true,
      "should display 'no key files matching:'"
    );
    done();
  });

  it("SaveCache runs successfully with warnings if no key files are found", function(done: MochaDone) {
    let tp = path.join(__dirname, "SaveCacheNoKeyFiles.js");
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();
    console.log(tr.succeeded);
    console.log(tr.stdout);
    assert.equal(tr.succeeded, true, "should have succeeded");
    assert.equal(
      tr.warningIssues.length > 0,
      true,
      "should have warnings from key file"
    );
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    assert.equal(
      tr.stdout.indexOf("no key files matching:") >= 0,
      true,
      "should display 'no key files matching:'"
    );
    done();
  });

  it("SaveCache runs successfully with warnings if no key files are found", function(done: MochaDone) {
    let tp = path.join(__dirname, "SaveCacheNoTargetFolders.js");
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();
    console.log(tr.succeeded);
    console.log(tr.stdout);
    assert.equal(tr.succeeded, true, "should have succeeded");
    assert.equal(
      tr.warningIssues.length > 0,
      true,
      "should have warnings from target folder"
    );
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    assert.equal(
      tr.stdout.indexOf("no target folders matching:") >= 0,
      true,
      "should display 'no target folders matching:'"
    );
    done();
  });

  it("RestoreCache is skipped if no run from repository fork", function(done: MochaDone) {
    let tp = path.join(__dirname, "RestoreCacheFromFork.js");
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();
    console.log(tr.succeeded);
    console.log(tr.stdout);
    assert.equal(tr.succeeded, true, "should have succeeded");
    assert.equal(tr.warningIssues.length, 0, "should have no warnings");
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    assert.equal(
      tr.stdout.indexOf("result=Skipped;") >= 0,
      true,
      "task result should be: 'Skipped'"
    );
    assert.equal(
      tr.stdout.indexOf("Caches are not restored for forked repositories.") >=
        0,
      true,
      "should display 'Caches are not restored for forked repositories.'"
    );
    done();
  });

  it("SaveCache is skipped if no run from repository fork", function(done: MochaDone) {
    let tp = path.join(__dirname, "SaveCacheFromFork.js");
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();
    console.log(tr.succeeded);
    console.log(tr.stdout);
    assert.equal(tr.succeeded, true, "should have succeeded");
    assert.equal(tr.warningIssues.length, 0, "should have no warnings");
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    assert.equal(
      tr.stdout.indexOf("result=Skipped;") >= 0,
      true,
      "task result should be: 'Skipped'"
    );
    assert.equal(
      tr.stdout.indexOf("Caches are not saved from forked repositories.") >= 0,
      true,
      "should display 'Caches are not saved from forked repositories.'"
    );
    done();
  });
});
