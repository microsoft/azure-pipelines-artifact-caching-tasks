// parse command line options
var minimist = require("minimist");
var mopts = {
  string: ["node", "runner", "server", "suite", "task", "version", "testResults"]
};
var options = minimist(process.argv, mopts);

// remove well-known parameters from argv before loading make,
// otherwise each arg will be interpreted as a make target
process.argv = options._;

// modules
var make = require("shelljs/make");
var fs = require("fs");
var os = require("os");
var path = require("path");
var semver = require("semver");
var util = require("./make-util");

// util functions
var cd = util.cd;
var mkdir = util.mkdir;
var rm = util.rm;
var test = util.test;
var run = util.run;
var banner = util.banner;
var fail = util.fail;
var ensureExists = util.ensureExists;
var buildNodeTask = util.buildNodeTask;
var addPath = util.addPath;
var copyTaskResources = util.copyTaskResources;
var matchFind = util.matchFind;
var matchCopy = util.matchCopy;
var ensureTool = util.ensureTool;
var getExternals = util.getExternals;
var createResjson = util.createResjson;
var createTaskLocJson = util.createTaskLocJson;
var validateTask = util.validateTask;
var fileToJson = util.fileToJson;
var createYamlSnippetFile = util.createYamlSnippetFile;
var createMarkdownDocFile = util.createMarkdownDocFile;

// global paths
var buildPath = path.join(__dirname, "_build", "Tasks");
var buildTestsPath = path.join(__dirname, "_build", "Tests");
var commonPath = path.join(__dirname, "_build", "Tasks", "Common");

// node min version
var minNodeVer = "6.10.3";
if (semver.lt(process.versions.node, minNodeVer)) {
  fail(
    "requires node >= " + minNodeVer + ".  installed: " + process.versions.node
  );
}

// add node modules .bin to the path so we can dictate version of tsc etc...
var binPath = path.join(__dirname, "node_modules", ".bin");
if (!test("-d", binPath)) {
  fail("node modules bin not found.  ensure npm install has been run.");
}
addPath(binPath);

// resolve list of tasks
var taskList;
if (options.task) {
  // find using --task parameter
  taskList = matchFind(options.task, path.join(__dirname, "Tasks"), {
    noRecurse: true,
    matchBase: true
  }).map(function(item) {
    return path.basename(item);
  });
  if (!taskList.length) {
    fail("Unable to find any tasks matching pattern " + options.task);
  }
} else {
  // load the default list
  taskList = fileToJson(path.join(__dirname, "make-options.json")).tasks;
}

// set the runner options. should either be empty or a comma delimited list of test runners.
// for example: ts OR ts,ps
//
// note, currently the ts runner igores this setting and will always run.
process.env["TASK_TEST_RUNNER"] = options.runner || "";

target.clean = function() {
  rm("-Rf", path.join(__dirname, "_build"));
  //   mkdir("-p", buildPath);
  rm("-Rf", path.join(__dirname, "_test"));
  rm("-Rf", path.join(__dirname, "_testresults"));
};

//
// Generate documentation (currently only YAML snippets)
// ex: node make.js gendocs
// ex: node make.js gendocs --task ShellScript
//
target.gendocs = function() {
  var docsDir = path.join(__dirname, "_gendocs");
  rm("-Rf", docsDir);
  mkdir("-p", docsDir);
  console.log();
  console.log("> generating docs");

  taskList.forEach(function(taskName) {
    var taskPath = path.join(__dirname, "Tasks", taskName);
    ensureExists(taskPath);

    // load the task.json
    var taskJsonPath = path.join(taskPath, "task.json");
    if (test("-f", taskJsonPath)) {
      var taskDef = fileToJson(taskJsonPath);
      validateTask(taskDef);

      // create YAML snippet Markdown
      var yamlOutputFilename = taskName + ".md";
      createYamlSnippetFile(taskDef, docsDir, yamlOutputFilename);

      // create Markdown documentation file
      var mdDocOutputFilename = taskName + ".md";
      createMarkdownDocFile(
        taskDef,
        taskJsonPath,
        docsDir,
        mdDocOutputFilename
      );
    }
  });

  banner("Generating docs successful", true);
};

//
// ex: node make.js build
// ex: node make.js build --task ShellScript
//
target.build = function() {
  target.clean();

  ensureTool("tsc", "--version", "Version 3.4.1");
  ensureTool("npm", "--version", function(output) {
    if (semver.lt(output, "5.6.0")) {
      fail("Expected 5.6.0 or higher. To fix, run: npm install -g npm");
    }
  });

  taskList.forEach(function(taskName) {
    banner("Building: " + taskName);
    var taskPath = path.join(__dirname, "Tasks", taskName);
    ensureExists(taskPath);

    // load the task.json
    var outDir;
    var shouldBuildNode = test("-f", path.join(taskPath, "tsconfig.json"));
    var taskJsonPath = path.join(taskPath, "task.json");
    if (test("-f", taskJsonPath)) {
      var taskDef = fileToJson(taskJsonPath);
      validateTask(taskDef);

      // fixup the outDir (required for relative pathing in legacy L0 tests)
      outDir = path.join(buildPath, taskName);

      // create loc files
      createTaskLocJson(taskPath);
      createResjson(taskDef, taskPath);

      // determine the type of task
      shouldBuildNode =
        shouldBuildNode || taskDef.execution.hasOwnProperty("Node");
    } else {
      outDir = path.join(buildPath, path.basename(taskPath));
    }

    mkdir("-p", outDir);

    // get externals
    var taskMakePath = path.join(taskPath, "make.json");
    var taskMake = test("-f", taskMakePath) ? fileToJson(taskMakePath) : {};
    if (taskMake.hasOwnProperty("externals")) {
      console.log("");
      console.log("> getting task externals");
      getExternals(taskMake.externals, outDir);
    }

    //--------------------------------
    // Common: build, copy, install
    //--------------------------------
    var commonPacks = [];
    if (taskMake.hasOwnProperty("common")) {
      var common = taskMake["common"];

      common.forEach(function(mod) {
        var modPath = path.join(taskPath, mod["module"]);
        var modName = path.basename(modPath);
        var modOutDir = path.join(commonPath, modName);

        if (!test("-d", modOutDir)) {
          banner("Building module " + modPath, true);

          mkdir("-p", modOutDir);

          // create loc files
          var modJsonPath = path.join(modPath, "module.json");
          if (test("-f", modJsonPath)) {
            createResjson(fileToJson(modJsonPath), modPath);
          }

          // npm install and compile
          if (
            (mod.type === "node" && mod.compile == true) ||
            test("-f", path.join(modPath, "tsconfig.json"))
          ) {
            buildNodeTask(modPath, modOutDir);
          }

          // copy default resources and any additional resources defined in the module's make.json
          console.log();
          console.log("> copying module resources");
          var modMakePath = path.join(modPath, "make.json");
          var modMake = test("-f", modMakePath) ? fileToJson(modMakePath) : {};
          copyTaskResources(modMake, modPath, modOutDir);

          // get externals
          if (modMake.hasOwnProperty("externals")) {
            console.log("");
            console.log("> getting module externals");
            getExternals(modMake.externals, modOutDir);
          }

          if (
            (mod.type === "node" && mod.compile == true) ||
            test("-f", path.join(modPath, "package.json"))
          ) {
            var commonPack = util.getCommonPackInfo(modOutDir);

            // assert the pack file does not already exist (name should be unique)
            if (test("-f", commonPack.packFilePath)) {
              fail(`Pack file already exists: ${commonPack.packFilePath}`);
            }

            // pack the Node module. a pack file is required for dedupe.
            // installing from a folder creates a symlink, and does not dedupe.
            cd(path.dirname(modOutDir));
            run(`npm pack ./${path.basename(modOutDir)}`);
          }
        }

        // store the npm pack file info
        if (mod.type === "node" && mod.compile == true) {
          commonPacks.push(util.getCommonPackInfo(modOutDir));
        }
        // copy ps module resources to the task output dir
        else if (mod.type === "ps") {
          console.log();
          console.log("> copying ps module to task");
          var dest;
          if (mod.hasOwnProperty("dest")) {
            dest = path.join(outDir, mod.dest, modName);
          } else {
            dest = path.join(outDir, "ps_modules", modName);
          }

          matchCopy("!Tests", modOutDir, dest, {
            noRecurse: true,
            matchBase: true
          });
        }
      });

      // npm install the common modules to the task dir
      if (commonPacks.length) {
        cd(taskPath);
        var installPaths = commonPacks.map(function(commonPack) {
          return `file:${path.relative(taskPath, commonPack.packFilePath)}`;
        });
        run(`npm install --save-exact ${installPaths.join(" ")}`);
      }
    }

    // build Node task
    if (shouldBuildNode) {
      buildNodeTask(taskPath, outDir);
    }

    // remove the hashes for the common packages, they change every build
    if (commonPacks.length) {
      var lockFilePath = path.join(taskPath, "package-lock.json");
      if (!test("-f", lockFilePath)) {
        lockFilePath = path.join(taskPath, "npm-shrinkwrap.json");
      }
      var packageLock = fileToJson(lockFilePath);
      Object.keys(packageLock.dependencies).forEach(function(dependencyName) {
        commonPacks.forEach(function(commonPack) {
          if (dependencyName == commonPack.packageName) {
            delete packageLock.dependencies[dependencyName].integrity;
          }
        });
      });
      fs.writeFileSync(lockFilePath, JSON.stringify(packageLock, null, "  "));
    }

    // copy default resources and any additional resources defined in the task's make.json
    console.log();
    console.log("> copying task resources");
    copyTaskResources(taskMake, taskPath, outDir);
  });

  banner("Build successful", true);
};

//
// will run tests for the scope of tasks being built
// npm test
// node make.js test
// node make.js test --task ShellScript --suite L0
//
target.test = function() {
  ensureTool("tsc", "--version", "Version 3.4.1");
  ensureTool("mocha", "--version", "6.0.2");

  // find the tests
  var suiteType = options.suite || "_suite";
  var taskType = options.task || "*";
  var pattern1 = buildPath + "/" + taskType + "/Tests/" + suiteType + ".js";
  var pattern2 =
    buildPath + "/Common/" + taskType + "/Tests/" + suiteType + ".js";
  var testsSpec = matchFind(pattern1, buildPath).concat(
    matchFind(pattern2, buildPath)
  );
  // .concat(matchFind(pattern3, buildTestsPath, { noRecurse: true }));
  if (!testsSpec.length && !process.env.TF_BUILD) {
    fail(
      `Unable to find tests using the following patterns: ${JSON.stringify([
        pattern1,
        pattern2,
        pattern3
      ])}`
    );
  }

  // setup the version of node to run the tests
  util.installNode(options.node);

  let testCmd = "";
  if (options.testResults)
    testCmd = ` --reporter mocha-junit-reporter --reporter-options mochaFile=${options.testResults}`;

  run(
    "mocha " +
      testsSpec.join(
        " "
      ) + testCmd,
    /*inheritStreams:*/ true
  );
};
