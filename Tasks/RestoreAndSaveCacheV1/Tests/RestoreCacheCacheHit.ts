import * as ma from "azure-pipelines-task-lib/mock-answer";
import * as tmrm from "azure-pipelines-task-lib/mock-run";
import * as path from "path";
import * as fs from "fs";
import {  TaskLibAnswers } from "azure-pipelines-task-lib/mock-answer";
import { UniversalMockHelper } from "packaging-common/Tests/UniversalMockHelper";

const taskPath = path.join(__dirname, "..", "restorecache.js");
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

const answers: TaskLibAnswers = {
  findMatch: {
    "**/*/yarn.lock": ["src/webapi/yarn.lock", "src/application/yarn.lock"],
    "**/*/node_modules": [],
  },
  rmRF: {
    "/users/home/directory/tmp_cache": { success: true },
  },
  checkPath: { },
  exec: { },
  exist: { },
  which: { },
};

const umh: UniversalMockHelper = new UniversalMockHelper(tmr, answers);

umh.mockUniversalCommand(
  "download",
  "node-package-feed",
  "builddefinition1",
  `1.0.0-${process.platform}-a31fc58e7e95f16dca2f3fe4b096f7c0e6406086eaaea885536e9b418b2d533d`,
  "/users/home/directory/tmp_cache",
  {
    code: 0,
    stdout: "ArtifactTool.exe output",
    stderr: "",
  }
);

tmr.setInput("keyFile", "**/*/yarn.lock");
tmr.setInput("targetFolders", "**/*/node_modules");

// provide answers for task mock
// const a: ma.TaskLibAnswers = {
//   findMatch: {
//     "**/*/yarn.lock": ["src/webapi/yarn.lock", "src/application/yarn.lock"],
//     "**/*/node_modules": [],
//   },
//   rmRF: {
//     "/users/home/directory/tmp_cache": { success: true },
//   },
// } as ma.TaskLibAnswers;

// tmr.setAnswers(a);

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
      return path.toString();
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
  symlinkSync: fs.symlinkSync,
});

tmr.registerMock("shelljs", {
  exec(command: string) {
    console.log(`Mock executing command: ${command}`);
  },
});

tmr.run();
