// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as tl from "azure-pipelines-task-lib";
const fs = require("fs");
const os = require("os");
import child = require("child_process");
import stream = require("stream");
import {IExecOptions, IExecSyncResult} from "azure-pipelines-task-lib/toolrunner";

export interface IArtifactToolOptions {
    artifactToolPath: string;
    feedId: string;
    accountUrl: string;
    packageName: string;
    packageVersion: string;
    publishedPackageVar: string;
}

export function getOptions(): IExecOptions {
    const result: IExecOptions = {
        cwd: process.cwd(),
        env: Object.assign({}, process.env),
        silent: false,
        failOnStdErr: false,
        ignoreReturnCode: false,
        windowsVerbatimArguments: false,
    } as IExecOptions;
    result.outStream = process.stdout as stream.Writable;
    result.errStream = process.stderr as stream.Writable;
    return result;
}

function getCommandString(toolPath: string, command: string[]) {
    let cmd: string = toolPath;
    command.forEach((a: string): void => {
        cmd += ` ${a}`;
    });
    return cmd;
}

export function runArtifactTool(artifactToolPath: string, command: string[], execOptions: IExecOptions): IExecSyncResult {

    if (tl.osType() === "Windows_NT" || artifactToolPath.trim().toLowerCase().endsWith(".exe")) {
        return tl.execSync(artifactToolPath, command, execOptions);
    } else {
        fs.chmodSync(artifactToolPath, "755");
        if (!execOptions.silent) {
            execOptions.outStream.write(getCommandString(artifactToolPath, command) + os.EOL);
        }

        const result = child.spawnSync(artifactToolPath, command, execOptions);

        if (!execOptions.silent && result.stdout && result.stdout.length > 0) {
            execOptions.outStream.write(result.stdout);
        }

        if (!execOptions.silent && result.stderr && result.stderr.length > 0) {
            execOptions.errStream.write(result.stderr);
        }

        const res: IExecSyncResult = { code: result.status, error: result.error } as IExecSyncResult;
        res.stdout = (result.stdout) ? result.stdout.toString() : null;
        res.stderr = (result.stderr) ? result.stderr.toString() : null;
        return res;
    }
}
