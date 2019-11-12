import * as fs from "fs";
import * as path from "path";
import * as tmrm from "azure-pipelines-task-lib/mock-run";
import { Constants } from "./Constants";
import {
  registerFeedUtilityMock,
  IMockResponse
} from "packaging-common/Tests/FeedUtilityMockHelper";
import { TaskLibAnswers } from "azure-pipelines-task-lib/mock-answer";
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

tmr.setInput("keyFile", "**/*/yarn.lock");
tmr.setInput("targetFolders", "**/*/node_modules");
tmr.setInput("dryRun", "true");

const response: IMockResponse = {
  responseCode: 200,
  data: {
    id: "1234-5678-90123-45678",
    name: "builddefinition",
    version: `1.0.0-${process.platform}-${Constants.Hash}`
  }
};

registerFeedUtilityMock(tmr, response);

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

tmr.run();
