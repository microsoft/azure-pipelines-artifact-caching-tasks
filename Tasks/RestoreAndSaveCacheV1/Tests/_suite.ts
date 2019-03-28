import * as path from "path";
import * as assert from "assert";
import * as ttm from "azure-pipelines-task-lib/mock-test";

before(function() {
  this.timeout(5000);
});

describe("RestoreCache tests", function() {
  before(function() {});

  after(() => {});

  it("RestoreCache runs successfully with warnings if no key files are found", function(done: MochaDone) {
    const tp = path.join(__dirname, "RestoreCacheNoKeyFiles.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

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

  it("RestoreCache is skipped if no run from repository fork", function(done: MochaDone) {
    const tp = path.join(__dirname, "RestoreCacheFromFork.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

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

  it("RestoreCache runs successfully if cache hit", (done: MochaDone) => {
    const tp = path.join(__dirname, "RestoreCacheCacheHit.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();
    console.log(tr.succeeded);
    console.log(tr.stdout);

    assert(
      tr.stdOutContained("getting mock artifact tool from service"),
      "should have used mock"
    );
    assert(tr.invokedToolCount === 1, "should have run ArtifactTool once");
    assert(
      tr.ran(
        "/users/tmp/ArtifactTool.exe universal download --feed TestFeed --service https://example.visualstudio.com/defaultcollection --package-name TestPackage --package-version 1.0.0 --path /Users/test/tmp --patvar UNIVERSAL_DOWNLOAD_PAT --verbosity verbose"
      ),
      "it should have run ArtifactTool"
    );
    assert(
      tr.stdOutContained("ArtifactTool.exe output"),
      "should have ArtifactTool output"
    );
    assert(tr.succeeded, "should have succeeded");
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    done();
  });
});

describe("SaveCache tests", function() {
  before(function() {});

  after(() => {});

  it("SaveCache runs successfully with warnings if no key files are found", function(done: MochaDone) {
    const tp = path.join(__dirname, "SaveCacheNoKeyFiles.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

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

  it("SaveCache runs successfully with warnings if no target folders are found", function(done: MochaDone) {
    const tp = path.join(__dirname, "SaveCacheNoTargetFolders.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

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

  it("SaveCache is skipped if no run from repository fork", function(done: MochaDone) {
    const tp = path.join(__dirname, "SaveCacheFromFork.js");
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

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
