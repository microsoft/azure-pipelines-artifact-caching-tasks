import {
  TaskLibAnswers,
  TaskLibAnswerExecResult
} from "azure-pipelines-task-lib/mock-answer";
import tmrm = require("azure-pipelines-task-lib/mock-run");
import * as pkgMock from "./MockHelper";
import * as artMock from "./ArtifactToolMockHelper";

export class UniversalMockHelper {
  constructor(
    private tmr: tmrm.TaskMockRunner,
    private answers: TaskLibAnswers,
    private artifactToolCmd: string
  ) {
    this.tmr.setInput("verbosity", "verbose");
    this.tmr.setInput("feedlist", "node-package-feed");

    process.env.AGENT_HOMEDIRECTORY = "/users/home/directory";
    (process.env.BUILD_SOURCESDIRECTORY = "/users/home/sources"),
      (process.env.SYSTEM_SERVERTYPE = "hosted");
    process.env.BUILD_DEFINITIONNAME = "build definition 1";
    process.env.ENDPOINT_AUTH_SYSTEMVSSCONNECTION =
      '{"parameters":{"AccessToken":"token"},"scheme":"OAuth"}';
    process.env.ENDPOINT_URL_SYSTEMVSSCONNECTION =
      "https://example.visualstudio.com/defaultcollection";
    process.env.SYSTEM_DEFAULTWORKINGDIRECTORY = "/users/home/directory";
    process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI =
      "https://example.visualstudio.com/defaultcollection";

    artMock.registerArtifactToolUtilitiesMock(tmr, this.artifactToolCmd);
    artMock.registerArtifactToolRunnerMock(this.tmr);
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
    console.log(
      `${
        this.artifactToolCmd
      } universal ${command} --feed ${feed} --service ${service} --package-name ${packageName} --package-version ${packageVersion} --path ${path} --patvar UNIVERSAL_${command.toUpperCase()}_PAT --verbosity verbose`
    );
    this.answers.exec[
      `${
        this.artifactToolCmd
      } universal ${command} --feed ${feed} --service ${service} --package-name ${packageName} --package-version ${packageVersion} --path ${path} --patvar UNIVERSAL_${command.toUpperCase()}_PAT --verbosity verbose`
    ] = result;
  }
}
