import {
  TaskLibAnswers,
  TaskLibAnswerExecResult
} from "azure-pipelines-task-lib/mock-answer";
import tmrm = require("azure-pipelines-task-lib/mock-run");
import * as pkgMock from "./MockHelper";
import * as artMock from "./ArtifactToolMockHelper";

export class UniversalMockHelper {
  private static ArtifactToolCmd: string = "/users/tmp/ArtifactTool.exe";

  public answers: TaskLibAnswers = {
    checkPath: {},
    exec: {},
    exist: {},
    findMatch: {},
    rmRF: {},
    which: {
      "/users/tmp/ArtifactTool.exe": UniversalMockHelper.ArtifactToolCmd,
    },
  };

  constructor(private tmr: tmrm.TaskMockRunner) {
    this.tmr.setInput("verbosity", "verbose");

    process.env.AGENT_HOMEDIRECTORY = "/users/home/directory";
    (process.env.BUILD_SOURCESDIRECTORY = "/users/home/sources"),
      (process.env.ENDPOINT_AUTH_SYSTEMVSSCONNECTION =
        '{"parameters":{"AccessToken":"token"},"scheme":"OAuth"}');
    process.env.ENDPOINT_URL_SYSTEMVSSCONNECTION =
      "https://example.visualstudio.com/defaultcollection";
    process.env.SYSTEM_DEFAULTWORKINGDIRECTORY = "/users/home/directory";
    process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI =
      "https://example.visualstudio.com/defaultcollection";
    process.env.SYSTEM_SERVERTYPE = "hosted";

    this.tmr.setAnswers(this.answers);

    artMock.registerArtifactToolUtilitiesMock(
      tmr,
      UniversalMockHelper.ArtifactToolCmd
    );
    artMock.registerArtifactToolRunnerMock(tmr);
    pkgMock.registerLocationHelpersMock(tmr);
  }

  public mockUniversalCommand(
    command: string,
    feed: string,
    packageName: string,
    packageVersion: string,
    path: string,
    result: TaskLibAnswerExecResult,
    service?: string
  ) {
    if (!service) {
      service = "https://example.visualstudio.com/defaultcollection";
    }
    this.answers.exec[
      `${
        UniversalMockHelper.ArtifactToolCmd
      } universal ${command} --feed ${feed} --service ${service} --package-name ${packageName} --package-version ${packageVersion} --path ${path} --patvar UNIVERSAL_DOWNLOAD_PAT --verbosity verbose`
    ] = result;
  }
}
