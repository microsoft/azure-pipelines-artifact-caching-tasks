import * as ma from "azure-pipelines-task-lib/mock-answer";
import * as tmrm from "azure-pipelines-task-lib/mock-run";
import * as path from "path";

const taskPath = path.join(__dirname, "..", "savecache.js");
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput("keyFile", "**/*/yarn.lock");
tmr.setInput("targetFolder", "**/*/node_modules");
process.env["SYSTEM_DEFAULTWORKINGDIRECTORY"] = "DefaultWorkingDirectory";

// provide answers for task mock
const a: ma.TaskLibAnswers = {
  findMatch: {
    "**/*/yarn.lock": ["src/webapi/yarn.lock", "src/application/yarn.lock"],
    "**/*/node_modules": [],
  },
  find: {
    DefaultWorkingDirectory: [
      "src/webapi/startup.config",
      "src/application/program.cs",
    ],
  },
  rmRF: {
    "*": { success: true },
  },
} as ma.TaskLibAnswers;

tmr.setAnswers(a);

tmr.run();
