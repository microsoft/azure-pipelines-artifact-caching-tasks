import * as path from "path";
import * as assert from "assert";
import * as ma from "azure-pipelines-task-lib/mock-answer";
import * as tmrm from "azure-pipelines-task-lib/mock-run";
import * as ttm from "azure-pipelines-task-lib/mock-test";

describe("restore cache tests", function() {
  before(function() {
    this.timeout(1000);
  });

  after(() => {});

  it("RestoreCache runs successfully with warnings if no key files are found", function(done: MochaDone) {
    let tp = path.join(__dirname, 'RestoreCacheNoKeyFiles.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();
    console.log(tr.succeeded);
    console.log(tr.stdout);
    assert.equal(tr.succeeded, true, 'should have succeeded');
    assert.equal(tr.warningIssues.length > 0, true, "should have warnings from key file");
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    assert.equal(tr.stdout.indexOf('no key files matching:') >= 0, true, "should display 'no key files matching:'");
    done();
  });

  it("SaveCache runs successfully with warnings if no key files are found", function(done: MochaDone) {
    let tp = path.join(__dirname, 'SaveCacheNoKeyFiles.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();
    console.log(tr.succeeded);
    console.log(tr.stdout);
    assert.equal(tr.succeeded, true, 'should have succeeded');
    assert.equal(tr.warningIssues.length > 0, true, "should have warnings from key file");
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    assert.equal(tr.stdout.indexOf('no key files matching:') >= 0, true, "should display 'no key files matching:'");
    done();
  });

  it("SaveCache runs successfully with warnings if no key files are found", function(done: MochaDone) {
    let tp = path.join(__dirname, 'SaveCacheNoTargetFolders.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();
    console.log(tr.succeeded);
    console.log(tr.stdout);
    assert.equal(tr.succeeded, true, 'should have succeeded');
    assert.equal(tr.warningIssues.length > 0, true, "should have warnings from target folder");
    assert.equal(tr.errorIssues.length, 0, "should have no errors");
    assert.equal(tr.stdout.indexOf('no target folders matching:') >= 0, true, "should display 'no target folders matching:'");
    done();
  });

});
