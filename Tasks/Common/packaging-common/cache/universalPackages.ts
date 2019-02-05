// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from "path";
import * as pkgLocationUtils from "../locationUtilities";
import * as tl from "vsts-task-lib";
import * as artifactToolUtilities from "./ArtifactToolUtilities";
import * as universalDownload from "./universaldownload";
import * as universalPublish from "./universalpublish";

export class UniversalPackages {
    private artifactToolPath: string;

    private init = async function main(command: string, hash: string, targetFolder: string) : Promise<void> {
        // Getting artifact tool
        tl.debug("Getting artifact tool");

        try {
            const localAccessToken = pkgLocationUtils.getSystemAccessToken();
            const serviceUri = tl.getEndpointUrl("SYSTEMVSSCONNECTION", false);
            const blobUri = await pkgLocationUtils.getBlobstoreUriFromBaseServiceUri(
                serviceUri,
                localAccessToken);

            // Finding the artifact tool directory
            this.artifactToolPath = await artifactToolUtilities.getArtifactToolFromService(
                blobUri,
                localAccessToken,
                "artifacttool");
        }
        catch (error) {
            console.log(error);
        }
    }

    download = async function (hash: string, targetFolder: string) : Promise<boolean> {
        if (!this.artifactToolPath) {
            await this.init();
        }
        return universalDownload.run(this.artifactToolPath, hash, targetFolder);
    }

    publish = async function(hash: string, targetFolder: string) : Promise<boolean> {
        if (!this.artifactToolPath) {
            await this.init();
        }
        return universalPublish.run(this.artifactToolPath, hash, targetFolder);
    }
}

