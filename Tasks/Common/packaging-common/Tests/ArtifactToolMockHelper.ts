import tmrm = require("azure-pipelines-task-lib/mock-run");
import { TaskLibAnswerExecResult} from "azure-pipelines-task-lib/mock-answer";

export function registerArtifactToolUtilitiesMock(
  tmr: tmrm.TaskMockRunner,
  toolPath: string
) {
  const artifactToolMocks = {
    getArtifactToolFromService(serviceUri, accessToken, toolName) {
      return toolPath;
    },
    getPackageNameFromId(
      serviceUri: string,
      accessToken: string,
      feedId: string,
      packageId: string
    ) {
      return packageId;
    },
  };
  tmr.registerMock("packaging-common/ArtifactToolUtilities", artifactToolMocks);
  tmr.registerMock("../ArtifactToolUtilities", artifactToolMocks);
}

export function registerArtifactToolRunnerMock(tmr: tmrm.TaskMockRunner) {
  const mtt = require("azure-pipelines-task-lib/mock-toolrunner");
  const artifactToolMocks = {
    getOptions() {
      return {
        cwd: process.cwd(),
        env: Object.assign({}, process.env),
        silent: false,
        failOnStdErr: false,
        ignoreReturnCode: false,
        windowsVerbatimArguments: false,
      };
    },
    runArtifactTool(
      artifactToolPath: string,
      command: string[],
      execOptions
    ) {
      const tr = new mtt.ToolRunner(artifactToolPath);
      tr.arg(command);
      return tr.execSync(execOptions);
    },
  };

  tmr.registerMock("packaging-common/ArtifactToolRunner", artifactToolMocks);
  tmr.registerMock("../ArtifactToolRunner", artifactToolMocks);
}
