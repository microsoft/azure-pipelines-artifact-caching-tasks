import * as ma from 'azure-pipelines-task-lib/mock-answer';
import * as tmrm from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';

let taskPath = path.join(__dirname, '..', 'savecache.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('keyFile', '**/*/yarn.lock');
tmr.setInput('targetFolder', '**/*/node_modules');

// provide answers for task mock
var a: ma.TaskLibAnswers = <ma.TaskLibAnswers>{
    "findMatch": {
        "**/*/yarn.lock": [ ]
    },
    "rmRF" : {
        "*": {success: true}
    }
};

tmr.setAnswers(a);

tmr.run();