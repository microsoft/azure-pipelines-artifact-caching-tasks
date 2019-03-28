import tmrm = require("azure-pipelines-task-lib/mock-run");

export function registerArtifactToolUtilitiesMock(
  tmr: tmrm.TaskMockRunner,
  toolPath: string
) {
  const artifactToolMocks = {
    getArtifactToolFromService(serviceUri, accessToken, toolName): Promise<string> {
      console.log("getting mock artifact tool from service");

      return Promise.resolve(toolPath);
    },
    getPackageNameFromId(
      serviceUri: string,
      accessToken: string,
      feedId: string,
      packageId: string
    ) {
      console.log("getting mock artifact package name");
      return packageId;
    },
  };
  tmr.registerMock("packaging-common/cache/ArtifactToolUtilities", artifactToolMocks);
  tmr.registerMock("../cache/ArtifactToolUtilities", artifactToolMocks);
}

export function registerArtifactToolRunnerMock(tmr: tmrm.TaskMockRunner) {
  const mtt = require("azure-pipelines-task-lib/mock-toolrunner");
  const artifactToolMocks = {
    getOptions() {
      console.log("getting mock options");
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
      console.log("running mock artifact tool");
      const tr = new mtt.ToolRunner(artifactToolPath);
      tr.arg(command);
      return tr.execSync(execOptions);
    },
  };

  tmr.registerMock("../cache/ArtifactToolRunner", artifactToolMocks);
  tmr.registerMock("packaging-common/cache/ArtifactToolRunner", artifactToolMocks);
}
