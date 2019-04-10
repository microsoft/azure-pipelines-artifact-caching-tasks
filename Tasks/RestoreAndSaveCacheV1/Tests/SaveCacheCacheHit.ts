import * as ma from "azure-pipelines-task-lib/mock-answer";
import * as tmrm from "azure-pipelines-task-lib/mock-run";
import * as path from "path";
import * as fs from "fs";

const taskPath = path.join(__dirname, "..", "savecache.js");
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);
const hash = "2f6b1287b26ff4716cffdeeabd434aa1a3da9f092ebf87579a916ca0bf91cd65";

tmr.setInput("keyFile", "**/*/yarn.lock");
tmr.setInput("targetFolder", "**/*/node_modules");

process.env["SYSTEM_DEFAULTWORKINGDIRECTORY"] = "DefaultWorkingDirectory";

const key = `${process.platform}-${hash}`;
process.env[key.toUpperCase()] = "true";

// provide answers for task mock
const a: ma.TaskLibAnswers = {
  findMatch: {
    "**/*/yarn.lock": ["src/webapi/yarn.lock", "src/application/yarn.lock"],
    "**/*/node_modules": ["src/webapi/node_modules", "src/application/node_modules"],
  },
  find: {
    DefaultWorkingDirectory: [
      "src/webapi/node_modules",
      "src/application/node_modules",
      "src/webapi/startup.config",
      "src/application/program.cs",
    ],
  },
  rmRF: {
    "*": { success: true },
  },
  stats: {
    "src/webapi/node_modules": {
      isDirectory() {return true; },
    },
    "src/application/node_modules": {
        isDirectory() {return true; },
    },
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
        const segments = path.split('/');
        return segments.splice(segments.length - 3).join('/');
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

tmr.run();