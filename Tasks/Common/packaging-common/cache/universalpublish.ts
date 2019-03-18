// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pkgLocationUtils from "../locationUtilities";
import { ProvenanceHelper } from "../provenance";
import * as tl from "vsts-task-lib";
import { IExecOptions, IExecSyncResult } from "vsts-task-lib/toolrunner";
import * as artifactToolRunner from "./ArtifactToolRunner";
import * as artifactToolUtilities from "./ArtifactToolUtilities";
import * as auth from "./Authentication";

export async function run(
  artifactToolPath: string,
  hash: string,
  targetFolder: string
): Promise<boolean> {
  let buildIdentityDisplayName: string = null;
  let buildIdentityAccount: string = null;
  try {
    // Get directory to publish
    let publishDir: string = targetFolder;
    let serviceUri: string;
    let feedId: string;
    let packageName: string;
    let version: string = `1.0.0-${hash}`;
    let accessToken: string;
    let feedUri: string;
    let publishedPackageVar: string = tl.getInput("publishedPackageVar");
    const versionRadio = "custom";

    let internalAuthInfo: auth.InternalAuthInfo;

    let toolRunnerOptions = artifactToolRunner.getOptions();

    let sessionId: string;

    // getting inputs
    serviceUri = tl.getEndpointUrl("SYSTEMVSSCONNECTION", false);

    packageName = tl
      .getVariable("Build.DefinitionName")
      .replace(/\s/g, "")
      .substring(0, 255)
      .toLowerCase();

    feedId = tl.getInput("feedList");

    // Setting up auth info
    accessToken = pkgLocationUtils.getSystemAccessToken();
    internalAuthInfo = new auth.InternalAuthInfo([], accessToken);

    toolRunnerOptions.env.UNIVERSAL_PUBLISH_PAT = internalAuthInfo.accessToken;

    // creating session
    const useSessionEnabled = tl.getVariable("Packaging.SavePublishMetadata");
    if (useSessionEnabled) {
      let packagingLocation: string;
      try {
        // This call is to get the packaging URI(abc.pkgs.vs.com) which is same for all protocols.
        packagingLocation = await pkgLocationUtils.getNuGetUriFromBaseServiceUri(
          serviceUri,
          accessToken
        );
      } catch (error) {
        tl.debug(JSON.stringify(error));
        packagingLocation = serviceUri;
      }

      const pkgConn = pkgLocationUtils.getWebApiWithProxy(
        packagingLocation,
        accessToken
      );
      sessionId = await ProvenanceHelper.GetSessionId(
        feedId,
        "upack" /* must match protocol name on the server */,
        pkgConn.serverUrl,
        [pkgConn.authHandler],
        pkgConn.options
      );
    }

    tl.debug(tl.loc("Info_UsingArtifactToolPublish"));

    if (sessionId != null) {
      feedId = sessionId;
    }

    // tslint:disable-next-line:no-object-literal-type-assertion
    const publishOptions = {
      artifactToolPath,
      feedId,
      accountUrl: serviceUri,
      packageName,
      packageVersion: version
    } as artifactToolRunner.IArtifactToolOptions;

    publishPackageUsingArtifactTool(
      publishDir,
      publishOptions,
      toolRunnerOptions
    );
    if (publishedPackageVar) {
      tl.setVariable(publishedPackageVar, `${packageName} ${version}`);
    }

    return true;
  } catch (err) {
    tl.error(err);

    if (buildIdentityDisplayName || buildIdentityAccount) {
      tl.warning(
        tl.loc(
          "BuildIdentityPermissionsHint",
          buildIdentityDisplayName,
          buildIdentityAccount
        )
      );
    }

    // tl.setResult(tl.TaskResult.Failed, tl.loc("PackagesFailedToPublish"));
    return false;
  }
}

function publishPackageUsingArtifactTool(
  publishDir: string,
  options: artifactToolRunner.IArtifactToolOptions,
  execOptions: IExecOptions
) {
  let command = new Array<string>();
  command.push(
    "universal",
    "publish",
    "--feed",
    options.feedId,
    "--service",
    options.accountUrl,
    "--package-name",
    options.packageName,
    "--package-version",
    options.packageVersion,
    "--path",
    publishDir,
    "--patvar",
    "UNIVERSAL_PUBLISH_PAT",
    "--verbosity",
    tl.getInput("verbosity"),
    "--description",
    tl.getInput("packagePublishDescription")
  );

  console.log(
    tl.loc(
      "Info_Publishing",
      options.packageName,
      options.packageVersion,
      options.feedId
    )
  );
  const execResult: IExecSyncResult = artifactToolRunner.runArtifactTool(
    options.artifactToolPath,
    command,
    execOptions
  );

  if (execResult.code === 0) {
    return;
  }

  // TODO: Check if permissions exist
  console.log(
    tl.loc(
      "Error_UnexpectedErrorArtifactTool",
      execResult.code,
      execResult.stderr ? execResult.stderr.trim() : execResult.stderr
    )
  );
}
