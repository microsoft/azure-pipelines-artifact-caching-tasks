// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import crypto = require("crypto");
import fs = require("fs");
import path = require("path");
import shell = require("shelljs");
import tl = require("vsts-task-lib/task");

import { UniversalPackages } from "./universalPackages";
const universalPackages = new UniversalPackages();

const isWin = process.platform === "win32";
const salt = 2;

export class cacheUtilities {
  hashFiles = function(files: string[]): string {
    let contents: string = "";
    files = files.sort();

    files.forEach(file => {
      let filePath = path.resolve(file);
      contents += fs.readFileSync(filePath, "utf8");
    });

    contents = contents.replace(/(\r|\n)/gm, "");
    contents += salt.toString();

    let hash = `${process.platform}-${crypto
      .createHash("sha256")
      .update(contents)
      .digest("hex")}`;
    return hash;
  };

  downloadCaches = async function(files: string[], destinationFolder: string) {
    const hash: string = await this.hashFiles(files);

    // Make our working folder
    let tmp_cache = path.join(
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

    try {
      let result = await universalPackages.download(hash, tmp_cache);

      // Check if blob exists
      if (result) {
        try {
          shell.exec(`tar -xzf ${tarballPath} -C "${destinationFolder}"`);

          // Set variable to track whether or not we downloaded cache (i.e. it already existed)
          tl.setVariable(hash, "true");
          tl.setVariable("CacheRestored", "true");
          return;
        } catch (err) {
          console.log(err);
        }
      } else {
        console.log("Cache miss: ", hash);
        tl.setVariable("CacheRestored", "false");
        tl.setVariable(hash, "false");
      }
    } catch (err) {
      console.log(err);
    }

    tl.rmRF(tmp_cache);
  };

  uploadCaches = async function(keyFiles: string[], targetFolders: string[]) {
    if (targetFolders.length == 0) {
      console.log("Issue: no artifacts specified to cache");
      return;
    }

    const hash: string = await this.hashFiles(keyFiles);

    // If we downloaded from a cached archive, no need to regenerate archive
    let status = tl.getVariable(hash);
    if (status === "true") {
      console.log("Cache entry already exists for: ", hash);
      return;
    }
    // If hash was not around during the restorecache step, we assume it was produced during build
    if (status === undefined) {
      console.log("Not caching artifact produced during build: ", hash);
      return;
    }

    console.log("Creating cache entry for: ", hash);

    // Make our working folder
    let tmp_cache = path.join(
      tl.getVariable("System.DefaultWorkingDirectory") || process.cwd(),
      "tmp_cache"
    );
    tl.mkdirP(tmp_cache);

    // Create tar archive
    let tarballParentDir = path.join(tmp_cache, "..");
    let tarballPath = path.join(tmp_cache, hash + ".tar.gz");

    // ensure exists
    if (!fs.existsSync(tmp_cache)) {
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
      let { stderr: error } = shell.exec(
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
        await universalPackages.publish(hash, tmp_cache);
      }
    } catch (err) {
      console.log(err);
    }

    // Delete tmp directory
    tl.rmRF(tmp_cache);
  };

  restoreCache = async function() {
    try {
      let buildStatus = tl.getVariable("Agent.JobStatus");
      if (buildStatus) {
        buildStatus = buildStatus.toLowerCase();
        if (
          buildStatus != "succeeded" &&
          buildStatus != "succeededwithissues"
        ) {
          tl.debug(
            "Bailing out from building artifacts due to previously unsuccessful task"
          );
          return;
        }
      }

      const patterns = tl.getInput("keyFile", true).split(/,[ ]*/g);

      const findOptions = <tl.FindOptions>{
        allowBrokenSymbolicLinks: false,
        followSpecifiedSymbolicLink: false,
        followSymbolicLinks: false
      };

      let files: string[] = tl.findMatch(
        tl.getVariable("System.DefaultWorkingDirectory"),
        patterns,
        findOptions
      );
      files.forEach(f => {
        tl.debug(`Found key file: ${f}`);
      });

      await this.downloadCaches(
        files,
        tl.getVariable("System.DefaultWorkingDirectory") || process.cwd()
      );
    } catch (err) {
      tl.setResult(tl.TaskResult.Failed, err.message);
    }
  };

  saveCache = async function() {
    try {
      let buildStatus = tl.getVariable("Agent.JobStatus");

      if (buildStatus) {
        buildStatus = buildStatus.toLowerCase();
        if (
          buildStatus != "succeeded" &&
          buildStatus != "succeededwithissues"
        ) {
          console.log(
            "Bailing out from building artifacts due to previously unsuccessful task"
          );
          return;
        }
      }

      let isFork = tl.getVariable("System.PullRequest.IsFork") || "undefined";

      if (isFork.toLowerCase() == "true") {
        console.log("Caches are not saved from forked repositories");
        return;
      }

      const patterns = tl.getInput("keyfile", true).split(/,[ ]*/g);
      const targetPatterns = tl.getInput("targetfolder", true).split(/,[ ]*/g);

      const findOptions = <tl.FindOptions>{
        allowBrokenSymbolicLinks: false,
        followSpecifiedSymbolicLink: false,
        followSymbolicLinks: false
      };

      let keyFiles: string[] = tl.findMatch(
        tl.getVariable("System.DefaultWorkingDirectory"),
        patterns,
        findOptions
      );
      keyFiles.forEach(f => {
        tl.debug(`Found key file: ${f}`);
      });

      // Construct this list of artifacts to store. These are relative to prevent the full path from
      let searchDirectory =
        tl.getVariable("System.DefaultWorkingDirectory") || process.cwd();
      let allPaths = tl.find(searchDirectory);
      let matchedPaths: string[] = tl.match(allPaths, targetPatterns);
      let targetFolders: string[] = matchedPaths
        .filter((itemPath: string) => tl.stats(itemPath).isDirectory())
        .map(folder => path.relative(searchDirectory, folder));

      tl.debug("\n\n\n-----------------------------");
      targetFolders.forEach(f => tl.debug(f));
      tl.debug("-----------------------------\n\n\n");

      await this.uploadCaches(keyFiles, targetFolders);
    } catch (err) {
      tl.setResult(tl.TaskResult.Failed, err.message);
    }
  };
}
