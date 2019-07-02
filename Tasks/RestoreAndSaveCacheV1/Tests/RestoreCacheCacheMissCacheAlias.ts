import * as tmrm from "azure-pipelines-task-lib/mock-run";
import * as path from "path";
import * as fs from "fs";
import { TaskLibAnswers } from "azure-pipelines-task-lib/mock-answer";
import { UniversalMockHelper } from "packaging-common/Tests/UniversalMockHelper";
import { Constants } from "./Constants";

const taskPath = path.join(__dirname, "..", "restorecache.js");
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

const a: TaskLibAnswers = {
  findMatch: {
    "**/*/yarn.lock": ["src/webapi/yarn.lock", "src/application/yarn.lock"],
    "**/*/node_modules": []
  },
  rmRF: {
    "/users/home/directory/tmp_cache": { success: true }
  },
  checkPath: {},
  exec: {},
  exist: {},
  which: {}
};

tmr.setAnswers(a);

const umh: UniversalMockHelper = new UniversalMockHelper(
  tmr,
  a,
  "/users/tmp/ArtifactTool.exe"
);

umh.mockUniversalCommand(
  "download",
  "node-package-feed",
  "builddefinition1",
  `1.0.0-${process.platform}-${Constants.Hash}`,
  "/users/home/directory/tmp_cache",
  {
    code: 1,
    stdout: "ArtifactTool.exe output",
    stderr: "Can't find the package "
  }
);

tmr.setInput("keyFile", "**/*/yarn.lock");
tmr.setInput("targetFolders", "**/*/node_modules");
tmr.setInput("alias", "Build");

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
    if (path.endsWith("/yarn.lock")) {
      const segments = path.split("/");
      return segments.splice(segments.length - 3).join("/");
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
    console.log(`Mock executing command: ${command}`);
    return {
      code: 0,
      stdout: "shelljs output",
      stderr: null
    };
  }
});

tmr.run();
