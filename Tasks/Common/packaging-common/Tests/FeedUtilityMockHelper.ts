import tmrm = require("azure-pipelines-task-lib/mock-run");
import Axios from "axios";
import MockAdapter from "axios-mock-adapter";

export interface IMockResponse {
  responseCode: number;
  data?: any;
}

export function registerFeedUtilityMock(
  tmr: tmrm.TaskMockRunner,
  response: IMockResponse
) {
  tmr.setInput("feedlist", "node-package-feed");
  tmr.setInput("verbosity", "verbose");

  process.env.BUILD_DEFINITIONNAME = "build definition";
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

  const mock = new MockAdapter(Axios);
  console.log("mocking this out");

  mock.onAny().reply(response.responseCode, response.data);
}
