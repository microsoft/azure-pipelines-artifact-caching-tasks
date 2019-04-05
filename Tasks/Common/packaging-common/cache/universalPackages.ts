// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as tl from "azure-pipelines-task-lib";
import * as pkgLocationUtils from "../locationUtilities";
import * as artifactToolUtilities from "../ArtifactToolUtilities";
import * as universalDownload from "./universaldownload";
import * as universalPublish from "./universalpublish";

export interface UniversalPackagesResult {
  toolRan: boolean;
  success: boolean;
}

export class UniversalPackages {
  private artifactToolPath: string;

  public download = async function(
    hash: string,
    targetFolder: string
  ): Promise<UniversalPackagesResult> {
    if (!this.artifactToolPath) {
      const initialized = await this.init();
      if (!initialized) {
        console.log("Error initializing artifact tool utility");
        return {
          toolRan: false,
          success: false,
        };
      }
    }
    return universalDownload.run(this.artifactToolPath, hash, targetFolder);
  };

  public publish = async function(
    hash: string,
    targetFolder: string
  ): Promise<UniversalPackagesResult> {
    if (!this.artifactToolPath) {
      const initialized = await this.init();
      if (!initialized) {
        console.log("Error initializing artifact tool utility");
        return {
          toolRan: false,
          success: false,
        };
      }
    }
    return universalPublish.run(this.artifactToolPath, hash, targetFolder);
  };

  private init = async function main(
    command: string,
    hash: string,
    targetFolder: string
  ): Promise<boolean> {
    // Getting artifact tool
    tl.debug("Getting artifact tool");

    try {
      const localAccessToken = pkgLocationUtils.getSystemAccessToken();
      const serviceUri = tl.getEndpointUrl("SYSTEMVSSCONNECTION", false);
      const blobUri = await pkgLocationUtils.getBlobstoreUriFromBaseServiceUri(
        serviceUri,
        localAccessToken
      );
      console.log(blobUri);

      // Finding the artifact tool directory
      this.artifactToolPath = await artifactToolUtilities.getArtifactToolFromService(
        blobUri,
        localAccessToken,
        "artifacttool"
      );

      if (!this.artifactToolPath) {
        return false;
      }

      console.log(this.artifactToolPath);
    } catch (error) {
      console.log(error);
      return false;
    }
    return true;
  };
}
