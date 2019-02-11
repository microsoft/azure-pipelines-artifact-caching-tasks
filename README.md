# Azure Pipelines Artifact Caching Tasks

[![Build Status](https://dev.azure.com/1es-cat/azure-pipelines-artifact-caching-tasks/_apis/build/status/Microsoft.azure-pipelines-artifact-caching-tasks?branchName=master)](https://dev.azure.com/1es-cat/azure-pipelines-artifact-caching-tasks/_build/latest?definitionId=17&branchName=master) [![Release status](https://vsrm.dev.azure.com/1es-cat/_apis/public/Release/badge/73af267c-80da-42c5-b634-ef63bb6d61fc/1/1)](https://dev.azure.com/1es-cat/azure-pipelines-artifact-caching-tasks/_release?definitionId=1)

This repo contains the tasks that enable the caching of intermediate artifacts from an Azure Pipelines build using Universal Artifacts.

## How to use

This build task is meant to add an easy way to provide caching of intermediate build artifacts. To demonstrate, let's examine the following build definition snippet:

```yaml
- task: 1ESLighthouseEng.PipelineArtifactCaching.RestoreCacheV1.RestoreCache@1
  inputs:
    keyfile: '**/yarn.lock, !**/node_modules/**/yarn.lock, !**/.*/**/yarn.lock'
    targetfolder: '**/node_modules, !**/node_modules/**/node_modules'
    vstsFeed: '$(ArtifactFeed)'

- script: |
    yarn install
  displayName: Install Dependencies

- task: 1ESLighthouseEng.PipelineArtifactCaching.SaveCacheV1.SaveCache@1
  inputs:
    keyfile: '**/yarn.lock, !**/node_modules/**/yarn.lock, !**/.*/**/yarn.lock'
    targetfolder: '**/node_modules, !**/node_modules/**/node_modules'
    vstsFeed: '$(ArtifactFeed)'
```

Conceptually, this snippet creates a lookup key from the `keyfile` argument and checks the `vstsFeed` for a matching entry. If one exists, it will be downloaded and unpacked. After more `node_modules` are restored via `yarn` the `SaveCache` task runs to create a cache entry if it wasn't available previously (if a cache entry was downloaded, this is a no-op).

Inputs:
- `keyfile`: The file or pattern of files to use for creating the lookup key of the cache. Due to the nature of `node_modules` potentially having their own `yarn.lock` file, this snippet explicitly excludes that pattern to ensure there is a consistent lookup key before and after package restoration.
- `targetfolder`: The file/folder or pattern of files/folders that you want to cache. The matching files/folders will be represented as the universal package that is uploaded to your Azure DevOps artifact feed.
- `vstsFeed`: The guid representing the artifact feed in Azure DevOps meant to store the build's caches.

If you do not want to add two build steps to your build definition, you can also use a single task that implicitly adds the `SaveCache` task at the end of the build. For example:

```yaml
- task: 1ESLighthouseEng.PipelineArtifactCaching.RestoreAndSaveCacheV1.RestoreAndSaveCache@1
  inputs:
    keyfile: '**/yarn.lock, !**/node_modules/**/yarn.lock, !**/.*/**/yarn.lock'
    targetfolder: '**/node_modules, !**/node_modules/**/node_modules'
    vstsFeed: '$(ArtifactFeed)'

- script: |
    yarn install
  displayName: Install Dependencies
```

## Optimistic cache restoration

If a cache was restored successfully, the build variable `CacheRestored` is set to `true`. This can provide a further perfomance boost by optionally skipping package install commands entirely.

In the following example, the 'yarn' task will only run if there was not a cache hit. Although this can provide faster builds, it may not be suitable for production builds.

```yaml
- task: 1ESLighthouseEng.PipelineArtifactCaching.RestoreAndSaveCacheV1.RestoreAndSaveCache@1
  inputs:
    keyfile: '**/yarn.lock, !**/node_modules/**/yarn.lock, !**/.*/**/yarn.lock'
    targetfolder: '**/node_modules, !**/node_modules/**/node_modules'
    vstsFeed: '$(ArtifactFeed)'

- script: |
    yarn install
  displayName: Install Dependencies
  condition: ne(variables['CacheRestored'], 'true')
```

## How to build

### Prerequisites: Node and Npm

**Windows and Mac OSX**: Download and install node from [nodejs.org](http://nodejs.org/)

**Linux**: Install [using package manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)

From a terminal ensure at least node 4.2 and npm 5:

```bash
$ node -v && npm -v
v4.2.0
5.6.0
```

To install npm separately:

```
[sudo] npm install npm@5 -g
npm -v
5.6.0
```

Note: On Windows, if it's still returning npm 2.x, run `where npm`. Notice hits in program files. Rename those two npm files and the 5.6.0 in AppData will win.

### Install Dependencies

Once:

```bash
npm install
```

### Build

The following instructions demonstrate how to build and test either all or a specific task. The output will be sent to
the `_build` directory.  You can then use the tfx client to upload this to your server for testing.

The build will also generate a `task.loc.json` and an english strings file under `Strings` in your source tree. You should check these back in. Another localization process will create the other strings files.

To build all tasks:

``` bash
npm run build
```

Optionally, you can build a specific task:

```bash
node make.js build --task RestoreCacheV1
```

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
