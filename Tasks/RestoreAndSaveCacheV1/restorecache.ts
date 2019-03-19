// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib';
import * as path from 'path';
import { cacheUtilities } from 'packaging-common/cache/cacheUtilities';
const cache = new cacheUtilities();

async function run() {
    tl.setResourcePath(path.join(__dirname, "task.json"));
    await cache.restoreCache();
}

run();