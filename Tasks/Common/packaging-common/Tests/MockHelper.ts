import tmrm = require("azure-pipelines-task-lib/mock-run");

export function registerLocationHelpersMock(tmr: tmrm.TaskMockRunner) {
  const mockLocationUtils = {
    getFeedUriFromBaseServiceUri(
      serviceUri: string,
      accesstoken: string
    ) {
      return serviceUri + "/feed";
    },
    getBlobstoreUriFromBaseServiceUri(
      serviceUri: string,
      accesstoken: string
    ) {
      return serviceUri + "/blobstore";
    },
    getPackagingUris(input) {
      const collectionUrl: string = "https://vsts/packagesource";
      return {
        PackagingUris: [collectionUrl],
        DefaultPackagingUri: collectionUrl,
      };
    },
    getWebApiWithProxy(serviceUri: string, accessToken?: string) {
      return {
        vsoClient: {
          async getVersioningData(
            ApiVersion: string,
            PackagingAreaName: string,
            PackageAreaId: string,
            Obj
          ) {
            return { requestUrl: "foobar" };
          },
        },
      };
    },

    getSystemAccessToken() {
      return "token";
    },

    getFeedRegistryUrl(
      packagingUrl: string,
      registryType,
      feedId: string,
      accessToken?: string
    ) {
      return packagingUrl + "/" + feedId;
    },
    ProtocolType: { NuGet: 1, Npm: 2, Maven: 3, PyPi: 4 },
    RegistryType: {
      npm: 1,
      NuGetV2: 2,
      NuGetV3: 3,
      PyPiSimple: 4,
      PyPiUpload: 5,
    },
  };
  tmr.registerMock('packaging-common/locationUtilities', mockLocationUtils);
  tmr.registerMock("../locationUtilities", mockLocationUtils);
}
