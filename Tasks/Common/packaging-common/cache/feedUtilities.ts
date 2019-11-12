import * as pkgLocationUtils from "../locationUtilities";
import * as tl from "azure-pipelines-task-lib";
import Axios, { AxiosRequestConfig } from "axios";

interface IPackage {
  id: string;
  name: string;
  version: string;
}

export async function doesPackageExist(hash: string): Promise<boolean> {
  const feedId = tl.getInput("feedList");
  // Getting package name from hash
  const packageId = tl
    .getVariable("Build.DefinitionName")
    .replace(/\s/g, "")
    .substring(0, 255)
    .toLowerCase();

  const version = `1.0.0-${hash}`;
  const accessToken = pkgLocationUtils.getSystemAccessToken();
  const collectionUri = process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI;

  let instance: string = "";
  const legacyRegex = /https:\/\/(\S+).visualstudio.com\S+/g;
  const newRegex = /https:\/\/dev.azure.com\/(\S+)\//g;

  const legacyUrl = legacyRegex.exec(collectionUri);
  const newUrl = newRegex.exec(collectionUri);

  if (legacyUrl) {
    instance = legacyUrl[1];
  } else if (newUrl) {
    instance = newUrl[1];
  } else {
    throw `Unable to parse collection uri: '${collectionUri}'`;
  }

  const url = `https://pkgs.dev.azure.com/${instance}/_apis/packaging/feeds/${feedId}/upack/packages/${packageId}/versions/${version}?api-version=5.1-preview.1`;

  const config: AxiosRequestConfig = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  };
  try {
    const result = await Axios.get<IPackage>(url, config);

    tl.debug(JSON.stringify(result.data));

    return result.data.version === version;
  } catch (err) {
    tl.debug(err.toString());

    return false;
  }
}
