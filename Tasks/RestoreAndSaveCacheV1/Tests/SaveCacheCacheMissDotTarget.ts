import * as tmrm from "azure-pipelines-task-lib/mock-run";
import * as path from "path";
import * as fs from "fs";
import { TaskLibAnswers } from "azure-pipelines-task-lib/mock-answer";
import { UniversalMockHelper } from "packaging-common/Tests/UniversalMockHelper";

const taskPath = path.join(__dirname, "..", "savecache.js");
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);
const hash = "caa22019107de89a8bbf9efd8a5273b37fa80bfb9c560e0bc349d5afd6df2ddc";

// provide answers for task mock
const a: TaskLibAnswers = {
  findMatch: {
    ".build/commit": [".build/commit"],
    ".build": [".build", ".build/commit"],
    "**/out-build": ["src/out/out-build"]
  },
  find: {
    DefaultWorkingDirectory: [
      "src/out/out-build",
      ".build/commit",
      ".buildfoo/bar"
    ]
  },
  rmRF: {
    "/users/home/DefaultWorkingDirectory/tmp_cache": { success: true },
    "DefaultWorkingDirectory/tmp_cache": { success: true },
    '"DefaultWorkingDirectory/tmp_cache"': { success: true }
  },
  stats: {
    "src/out/out-build": {
      isDirectory() {
        return true;
      }
    },
    ".build": {
      isDirectory: true
    },
    ".build/commit": {
      isDirectory: false
    }
  },
  exist: {
    "DefaultWorkingDirectory/tmp_cache": true
  },
  checkPath: {},
  exec: {},
  which: {}
};

tmr.setAnswers(a);

const umh: UniversalMockHelper = new UniversalMockHelper(
  tmr,
  a,
  "/users/tmp/ArtifactTool.exe"
);

umh.mockUniversalCommand(
  "publish",
  "node-package-feed",
  "builddefinition1",
  `1.0.0-${process.platform}-${hash}`,
  "DefaultWorkingDirectory/tmp_cache",
  {
    code: 0,
    stdout: "ArtifactTool.exe output",
    stderr: ""
  }
);

tmr.setInput("keyFile", ".build/commit");
tmr.setInput("targetFolder", ".build");

const key = `${process.platform}-${hash}`.toUpperCase();
process.env[key] = "false";
process.env["SYSTEM_DEFAULTWORKINGDIRECTORY"] = "DefaultWorkingDirectory";

// mock a specific module function called in task
tmr.registerMock("fs", {
  readFileSync(
    path: string,
    options:
      | string
      | {
          encoding: string;
          flag?: string;
        }
  ): string {
    if (path.endsWith("/commit")) {
      const segments = path.split("/");
      return segments.splice(segments.length - 2).join("/");
    }
    return fs.readFileSync(path, options);
  },
  chmodSync: fs.chmodSync,
  writeFileSync: fs.writeFileSync,
  readdirSync: fs.readdirSync,
  mkdirSync: fs.mkdirSync,
  copyFileSync: fs.copyFileSync,
  statSync: fs.statSync,
  linkSync: fs.linkSync,
  symlinkSync: fs.symlinkSync
});

tmr.registerMock("shelljs", {
  exec(command: string) {
    console.log(`Mock exec: ${command}`);
    return {
      code: 0,
      stdout: "shelljs output",
      stderr: null
    };
  }
});

tmr.run();
