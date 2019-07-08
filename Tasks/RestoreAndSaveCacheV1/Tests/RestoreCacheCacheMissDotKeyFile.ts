import * as tmrm from "azure-pipelines-task-lib/mock-run";
import * as path from "path";
import * as fs from "fs";
import { TaskLibAnswers } from "azure-pipelines-task-lib/mock-answer";
import { UniversalMockHelper } from "packaging-common/Tests/UniversalMockHelper";

const taskPath = path.join(__dirname, "..", "restorecache.js");
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

const hash = "057b9e891c2548f0ed5583b07f7cb08d0a77eba71a37511fb55dbc67e6c0df25";

const a: TaskLibAnswers = {
  findMatch: {
    ".commit": [".commit"],
    "**/out-build": ["src/out/out-build"]
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
  `1.0.0-${process.platform}-${hash}`,
  "/users/home/directory/tmp_cache",
  {
    code: 1,
    stdout: "ArtifactTool.exe output",
    stderr: "Can't find the package "
  }
);

tmr.setInput("keyFile", ".commit");
tmr.setInput("targetFolder", "**/out-build");

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
    if (path.endsWith(".commit")) {
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
    console.log(`Mock executing command: ${command}`);
    return {
      code: 0,
      stdout: "shelljs output",
      stderr: null
    };
  }
});

tmr.run();
