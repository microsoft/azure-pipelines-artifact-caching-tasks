// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import crypto = require("crypto");
import fs = require("fs");
import path = require("path");
import shell = require("shelljs");
import tl = require("azure-pipelines-task-lib/task");

import { UniversalPackages } from "./universalPackages";
import { doesPackageExist } from "./feedUtilities";
const universalPackages = new UniversalPackages();

const isWin = process.platform === "win32";
const salt = 2;

export class cacheUtilities {
  public hashFiles = function(files: string[]): string {
    let contents: string = "";
    files = files.sort();

    files.forEach(file => {
      const filePath = tl.resolve(file);
      contents += fs.readFileSync(filePath, "utf8");
    });

    contents = contents.replace(/(\r|\n)/gm, "");
    contents += salt.toString();

    const isPlatformIndependent =
      tl.getInput("platformIndependent", false) === "true";

    const prefix = isPlatformIndependent ? "" : `${process.platform}-`;

    const hash = `${prefix}${crypto
      .createHash("sha256")
      .update(contents)
      .digest("hex")}`;
    return hash;
  };

  public downloadCaches = async function(
    files: string[],
    destinationFolder: string
  ) {
    const hash: string = await this.hashFiles(files);

    // Make our working folder
    const tmp_cache = path.join(
      tl.getVariable("System.DefaultWorkingDirectory") || process.cwd(),
      "tmp_cache"
    );
    let tarballPath = path.join(tmp_cache, hash + ".tar.gz");
    tl.mkdirP(tmp_cache);

    // Convert to unix path
    if (isWin) {
      destinationFolder =
        "/" + destinationFolder.replace(":", "").replace(/\\/g, "/");
      tarballPath = "/" + tarballPath.replace(":", "").replace(/\\/g, "/");
    }

    const dryRun = tl.getBoolInput("dryRun", false);
    const alias = tl.getInput("alias", false);

    if (dryRun) {
      try {
        const packageExists = await doesPackageExist(hash);

        const output =
          alias && alias.length > 0 ? `CacheExists-${alias}` : "CacheExists";
        tl.setVariable(output, packageExists ? "true" : "false");
        tl.setVariable(hash, packageExists ? "true" : "false");
      } catch (err) {
        console.log(err);
      }

      return;
    }

    try {
      const result = await universalPackages.download(hash, tmp_cache);

      const output =
        alias && alias.length > 0 ? `CacheRestored-${alias}` : "CacheRestored";

      if (!result.toolRan) {
        tl.warning("Issue running universal packages tools");
      } else if (result.success) {
        try {
          shell.exec(`tar -xzf ${tarballPath} -C "${destinationFolder}"`);

          // Set variable to track whether or not we downloaded cache (i.e. it already existed)
          tl.setVariable(hash, "true");
          tl.setVariable(output, "true");
          return;
        } catch (err) {
          console.log(err);
        }
      } else {
        console.log("Cache miss: ", hash);
        tl.setVariable(output, "false");
        tl.setVariable(hash, "false");
      }
    } catch (err) {
      console.log(err);
    }

    tl.rmRF(tmp_cache);
  };

  public uploadCaches = async function(
    keyFiles: string[],
    targetFolders: string[]
  ) {
    if (targetFolders.length === 0) {
      console.log("Issue: no artifacts specified to cache");
      return;
    }

    const hash: string = await this.hashFiles(keyFiles);

    // If we downloaded from a cached archive, no need to regenerate archive
    const status = tl.getVariable(hash);
    // const status = process.env[hash];
    if (status === "true") {
      console.log("Cache entry already exists for: ", hash);
      return;
    }
    // If hash was not around during the restorecache step, we assume it was produced during build
    if (status === undefined) {
      tl.setResult(
        tl.TaskResult.Skipped,
        `Not caching artifact produced during build: ${hash}`
      );
      return;
    }

    console.log("Creating cache entry for: ", hash);

    // Make our working folder
    const tmp_cache = path.join(
      tl.getVariable("System.DefaultWorkingDirectory") || process.cwd(),
      "tmp_cache"
    );
    tl.mkdirP(tmp_cache);

    // Create tar archive
    let tarballParentDir = path.join(tmp_cache, "..");
    let tarballPath = path.join(tmp_cache, hash + ".tar.gz");

    // ensure exists
    if (!tl.exist(tmp_cache)) {
      console.log("Artifact directory does not exist: ", tmp_cache);
      return;
    }

    if (isWin) {
      tarballParentDir =
        "/" + tarballParentDir.replace(":", "").replace(/\\/g, "/");
      tarballPath = "/" + tarballPath.replace(":", "").replace(/\\/g, "/");
      targetFolders = targetFolders.map(folder => folder.replace(/\\/g, "/"));
    }

    try {
      const {
        stderr: error
      } = shell.exec(
        `tar -C "${tarballParentDir}" -czf "${tarballPath}" ${targetFolders
          .map(t => `\"${t}\"`)
          .join(" ")}`,
        { silent: true }
      );

      if (error) {
        console.log(`Issue creating tarball:\n    ${error}`);
      } else {
        console.log(`Tarball created:\n    ${tarballPath}`);

        // Upload universal package
        const result = await universalPackages.publish(hash, tmp_cache);

        if (!result.toolRan) {
          tl.warning("Issue running universal packages tools");
        } else if (result.success) {
          console.log("Cache successfully saved");
        } else {
          tl.warning(
            "Cache unsuccessfully saved. Find more information in logs above"
          );
        }
      }
    } catch (err) {
      console.log(err);
    }

    // Delete tmp directory
    tl.rmRF(tmp_cache);
  };

  public restoreCache = async function() {
    try {
      let buildStatus = tl.getVariable("Agent.JobStatus");
      if (buildStatus) {
        buildStatus = buildStatus.toLowerCase();
        if (
          buildStatus !== "succeeded" &&
          buildStatus !== "succeededwithissues"
        ) {
          tl.debug(
            "Bailing out from building artifacts due to previously unsuccessful task"
          );
          return;
        }
      }

      const isFork = tl.getVariable("System.PullRequest.IsFork") || "undefined";

      if (isFork.toLowerCase() === "true") {
        tl.setResult(
          tl.TaskResult.Skipped,
          "Caches are not restored for forked repositories."
        );
        return;
      }

      const patterns = tl.getInput("keyFile", true).split(/,[ ]*/g);

      const findOptions = {
        allowBrokenSymbolicLinks: false,
        followSpecifiedSymbolicLink: false,
        followSymbolicLinks: false
      } as tl.FindOptions;

      const files: string[] = tl.findMatch(
        tl.getVariable("System.DefaultWorkingDirectory"),
        patterns,
        findOptions
      );
      files.forEach(f => {
        tl.debug(`Found key file: ${f}`);
      });

      if (files.length === 0) {
        tl.warning(`no key files matching: ${patterns}`);
        return;
      }

      await this.downloadCaches(
        files,
        tl.getVariable("System.DefaultWorkingDirectory") || process.cwd()
      );
    } catch (err) {
      console.log(`error: ${err}`);
      tl.setResult(tl.TaskResult.Failed, err.message);
    }
  };

  public saveCache = async function() {
    try {
      let buildStatus = tl.getVariable("Agent.JobStatus");

      if (buildStatus) {
        buildStatus = buildStatus.toLowerCase();
        if (
          buildStatus !== "succeeded" &&
          buildStatus !== "succeededwithissues"
        ) {
          console.log(
            "Bailing out from building artifacts due to previously unsuccessful task"
          );
          return;
        }
      }

      const isFork = tl.getVariable("System.PullRequest.IsFork") || "undefined";

      if (isFork.toLowerCase() === "true") {
        tl.setResult(
          tl.TaskResult.Skipped,
          "Caches are not saved from forked repositories."
        );
        return;
      }

      const patterns = tl.getInput("keyfile", true).split(/,[ ]*/g);
      const targetPatterns = tl.getInput("targetfolder", true).split(/,[ ]*/g);

      const findOptions = {
        allowBrokenSymbolicLinks: false,
        followSpecifiedSymbolicLink: false,
        followSymbolicLinks: false
      } as tl.FindOptions;

      const keyFiles: string[] = tl.findMatch(
        tl.getVariable("System.DefaultWorkingDirectory"),
        patterns,
        findOptions
      );
      keyFiles.forEach(f => {
        tl.debug(`Found key file: ${f}`);
      });

      if (keyFiles.length === 0) {
        tl.warning(`no key files matching: ${patterns}`);
        return;
      }

      // Construct this list of artifacts to store. These are relative to prevent the full path from
      const searchDirectory =
        tl.getVariable("System.DefaultWorkingDirectory") || process.cwd();

      const targetFolders: string[] = tl
        .findMatch(searchDirectory, targetPatterns, findOptions)
        .filter((itemPath: string) => tl.stats(itemPath).isDirectory())
        .map(folder => path.relative(searchDirectory, folder));

      if (targetFolders.length === 0) {
        tl.warning(`no target folders matching: ${targetPatterns}`);
        return;
      }

      tl.debug("\n\n\n-----------------------------");
      targetFolders.forEach(f => tl.debug(`Found target folder: ${f}`));
      tl.debug("-----------------------------\n\n\n");

      await this.uploadCaches(keyFiles, targetFolders);
    } catch (err) {
      tl.setResult(tl.TaskResult.Failed, err.message);
    }
  };
}
