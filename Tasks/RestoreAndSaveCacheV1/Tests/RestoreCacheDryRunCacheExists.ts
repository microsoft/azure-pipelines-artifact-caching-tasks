import * as tmrm from "azure-pipelines-task-lib/mock-run";
import * as path from "path";
import * as fs from "fs";
import { TaskLibAnswers } from "azure-pipelines-task-lib/mock-answer";
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

tmr.setInput("keyFile", "**/*/yarn.lock");
tmr.setInput("targetFolders", "**/*/node_modules");
tmr.setInput("dryRun", "true");
tmr.setInput("feedlist", "node-package-feed");
tmr.setInput("verbosity", "verbose");

process.env.BUILD_DEFINITIONNAME = "test build definition";
process.env.AGENT_HOMEDIRECTORY = "/users/home/directory";
process.env.BUILD_SOURCESDIRECTORY = "/users/home/sources";
process.env.SYSTEM_SERVERTYPE = "hosted";
process.env.ENDPOINT_AUTH_SYSTEMVSSCONNECTION =
  '{"parameters":{"AccessToken":"token"},"scheme":"OAuth"}';
process.env.ENDPOINT_URL_SYSTEMVSSCONNECTION =
  "https://example.visualstudio.com/defaultcollection";
process.env.SYSTEM_DEFAULTWORKINGDIRECTORY = "/users/home/directory";
process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI =
  "https://example.visualstudio.com/defaultcollection";

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
