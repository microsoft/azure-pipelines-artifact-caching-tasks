import * as ma from "azure-pipelines-task-lib/mock-answer";
import * as tmrm from "azure-pipelines-task-lib/mock-run";
import * as path from "path";

let taskPath = path.join(__dirname, "..", "restorecache.js");
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput("keyFile", "**/*/yarn.lock");
tmr.setInput("targetFolders", "**/*/node_modules");

process.env["SYSTEM_PULLREQUEST_ISFORK"] = "true";

tmr.run();
