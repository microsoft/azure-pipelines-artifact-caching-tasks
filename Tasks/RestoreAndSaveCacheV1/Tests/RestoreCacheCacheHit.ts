import * as ma from "azure-pipelines-task-lib/mock-answer";
import * as tmrm from "azure-pipelines-task-lib/mock-run";
import * as path from "path";
import * as fs from "fs";

import { UniversalMockHelper } from "packaging-common/Tests/UniversalMockHelper";

const taskPath = path.join(__dirname, "..", "restorecache.js");
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);
const umh: UniversalMockHelper = new UniversalMockHelper(tmr);

umh.mockUniversalCommand(
  "download",
  "TestFeed",
  "TestPackage",
  "1.0.0",
  "/Users/test/tmp",
  {
    code: 0,
    stdout: "ArtifactTool.exe output",
    stderr: "",
  }
);

tmr.setInput("keyFile", "**/*/yarn.lock");
tmr.setInput("targetFolders", "**/*/node_modules");

// provide answers for task mock
const a: ma.TaskLibAnswers = {
  findMatch: {
    "**/*/yarn.lock": ["src/webapi/yarn.lock", "src/application/yarn.lock"],
    "**/*/node_modules": [],
  },
  rmRF: {
    "/users/home/directory/tmp_cache": { success: true },
  },
} as ma.TaskLibAnswers;

tmr.setAnswers(a);

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

// const artifactToolMocks = {
//   getArtifactToolFromService(serviceUri, accessToken, toolName): Promise<string> {
//     console.log("getting mock artifact tool from service");

//     return Promise.resolve(toolPath);
//   },
//   getPackageNameFromId(
//     serviceUri: string,
//     accessToken: string,
//     feedId: string,
//     packageId: string
//   ) {
//     console.log("getting mock artifact package name");
//     return packageId;
//   },
// };
// tmr.registerMock("packaging-common/cache/ArtifactToolUtilities", artifactToolMocks);
// tmr.registerMock("../cache/ArtifactToolUtilities", artifactToolMocks);

tmr.run();
