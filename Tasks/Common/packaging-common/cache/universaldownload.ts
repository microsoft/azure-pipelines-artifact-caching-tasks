// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as tl from "azure-pipelines-task-lib";
import * as pkgLocationUtils from "../locationUtilities";
import { IExecSyncResult, IExecOptions } from "azure-pipelines-task-lib/toolrunner";
import * as artifactToolRunner from "../ArtifactToolRunner";
import * as artifactToolUtilities from "../ArtifactToolUtilities";
import * as auth from "./Authentication";
import { UniversalPackagesResult } from "./universalPackages";

export async function run(artifactToolPath: string, hash: string, targetFolder: string): Promise<UniversalPackagesResult> {
    try {
        // Get directory to publish
        const downloadDir: string = targetFolder;
        if (downloadDir.length < 1) {
            tl.warning(tl.loc("Info_DownloadDirectoryNotFound"));
            return;
        }

        let serviceUri: string;
        let feedId: string;
        let packageName: string;
        let version: string;

        // Feed Auth
        let internalAuthInfo: auth.InternalAuthInfo;

        const toolRunnerOptions = artifactToolRunner.getOptions();

        // getting inputs
        serviceUri = tl.getEndpointUrl("SYSTEMVSSCONNECTION", false);

        feedId = tl.getInput("feedList");

        // Getting package name from hash
        const packageId = tl.getVariable('Build.DefinitionName')
            .replace(/\s/g, "")
            .substring(0, 255)
            .toLowerCase();

        const accessToken = pkgLocationUtils.getSystemAccessToken();

        internalAuthInfo = new auth.InternalAuthInfo([], accessToken);

        const feedUri = await pkgLocationUtils.getFeedUriFromBaseServiceUri(serviceUri, accessToken);
        packageName = await artifactToolUtilities.getPackageNameFromId(feedUri, accessToken, feedId, packageId);

        // Getting package version from hash
        version = `1.0.0-${hash}`;

        toolRunnerOptions.env.UNIVERSAL_DOWNLOAD_PAT = internalAuthInfo.accessToken;

        tl.debug(tl.loc("Info_UsingArtifactToolDownload"));

        const downloadOptions = {
            artifactToolPath,
            feedId,
            accountUrl: serviceUri,
            packageName,
            packageVersion: version,
        } as artifactToolRunner.IArtifactToolOptions;

        downloadPackageUsingArtifactTool(downloadDir, downloadOptions, toolRunnerOptions);

        console.log('artifact downloaded');
        return {
            toolRan: true,
            success: true,
          };
    } catch (err) {
        if (!err.message.includes("Can't find the package")) {
            tl.warning(err);
            return {
                toolRan: false,
                success: false,
              };
        }
 
        return {
            toolRan: true,
            success: false,
          };
    }
}

function downloadPackageUsingArtifactTool(downloadDir: string, options: artifactToolRunner.IArtifactToolOptions, execOptions: IExecOptions) {

    const command = new Array<string>();

    command.push("universal", "download",
        "--feed", options.feedId,
        "--service", options.accountUrl,
        "--package-name", options.packageName,
        "--package-version", options.packageVersion,
        "--path", downloadDir,
        "--patvar", "UNIVERSAL_DOWNLOAD_PAT",
        "--verbosity", tl.getInput("verbosity"));

    console.log(tl.loc("Info_Downloading", options.packageName, options.packageVersion, options.feedId));
    const execResult: IExecSyncResult = artifactToolRunner.runArtifactTool(options.artifactToolPath, command, execOptions);

    if (execResult.code === 0) {
        return;
    }

    throw new Error(tl.loc("Error_UnexpectedErrorArtifactToolDownload",
        execResult.code,
        execResult.stderr ? execResult.stderr.trim() : execResult.stderr));
}
