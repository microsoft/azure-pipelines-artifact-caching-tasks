// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pkgLocationUtils from "../locationUtilities";
import { ProvenanceHelper } from "../provenance";
import * as tl from "azure-pipelines-task-lib";
import { IExecOptions, IExecSyncResult } from "azure-pipelines-task-lib/toolrunner";
import * as artifactToolRunner from "../ArtifactToolRunner";
import * as artifactToolUtilities from "../ArtifactToolUtilities";
import * as auth from "./Authentication";
import { UniversalPackagesResult } from "./universalPackages";

export async function run(artifactToolPath: string, hash: string, targetFolder: string): Promise<UniversalPackagesResult> {
    const buildIdentityDisplayName: string = null;
    const buildIdentityAccount: string = null;
    try {
        // Get directory to publish
        const publishDir: string = targetFolder;
        let serviceUri: string;
        let feedId: string;
        let packageName: string;
        const version: string = `1.0.0-${hash}`;
        let accessToken: string;
        let feedUri: string;
        const publishedPackageVar: string = tl.getInput("publishedPackageVar");
        const versionRadio = 'custom';

        let internalAuthInfo: auth.InternalAuthInfo;

        const toolRunnerOptions = artifactToolRunner.getOptions();

        let sessionId: string;

        // getting inputs
        serviceUri = tl.getEndpointUrl("SYSTEMVSSCONNECTION", false);

        packageName = tl.getVariable('Build.DefinitionName')
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
                    accessToken);
            } catch (error) {
                tl.debug(JSON.stringify(error));
                packagingLocation = serviceUri;
            }

            const pkgConn = pkgLocationUtils.getWebApiWithProxy(packagingLocation, accessToken);
            sessionId = await ProvenanceHelper.GetSessionId(
                feedId,
                "upack", /* must match protocol name on the server */
                pkgConn.serverUrl,
                [pkgConn.authHandler],
                pkgConn.options);
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
            packageVersion: version,
        } as artifactToolRunner.IArtifactToolOptions;

        publishPackageUsingArtifactTool(publishDir, publishOptions, toolRunnerOptions);
        if (publishedPackageVar) {
            tl.setVariable(publishedPackageVar, `${packageName} ${version}`);
        }

        return {
            toolRan: true,
            success: true,
          };
    } catch (err) {
        tl.warning(`Issue saving package: ${err}`);
        return {
            toolRan: true,
            success: false,
          };
    }
}

function publishPackageUsingArtifactTool(publishDir: string, options: artifactToolRunner.IArtifactToolOptions, execOptions: IExecOptions) {
    const command = new Array<string>();
    command.push("universal", "publish",
        "--feed", options.feedId,
        "--service", options.accountUrl,
        "--package-name", options.packageName,
        "--package-version", options.packageVersion,
        "--path", publishDir,
        "--patvar", "UNIVERSAL_PUBLISH_PAT",
        "--verbosity", tl.getInput("verbosity"));

    console.log(tl.loc("Info_Publishing", options.packageName, options.packageVersion, options.feedId));
    const execResult: IExecSyncResult = artifactToolRunner.runArtifactTool(options.artifactToolPath, command, execOptions);

    if (execResult.code === 0) {
        return;
    }

    throw new Error(tl.loc("Error_UnexpectedErrorArtifactTool",
        execResult.code,
        execResult.stderr ? execResult.stderr.trim() : execResult.stderr));
}
