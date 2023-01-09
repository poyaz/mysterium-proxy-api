import {ICreateRunnerRepositoryInterface} from '@src-core/interface/i-create-runner-repository.interface';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {AsyncReturn, Return} from '@src-core/utility';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import Docker = require('dockerode');
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {ProxyDownstreamModel} from '@src-core/model/proxy.model';
import {DockerLabelParser} from '@src-infrastructure/utility/docker-label-parser';
import {defaultModelType} from '@src-core/model/defaultModel';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import {NotRunningServiceException} from '@src-core/exception/not-running-service.exception';
import {RepositoryException} from '@src-core/exception/repository.exception';

type EnvoyDockerContainerOption = {
  imageName: string,
  hostVolumeConfigName: string,
  defaultPort: number,
  networkName: string,
  isEnableWaitStartup: boolean,
  isEnableWaitHealthcheck: boolean,
}

export class DockerRunnerCreateEnvoyRepository implements ICreateRunnerRepositoryInterface {
  readonly serviceType: RunnerServiceEnum = RunnerServiceEnum.ENVOY;

  private readonly _namespace: string;

  constructor(
    private readonly _docker: Docker,
    private readonly _identity: IIdentifier,
    private readonly _envoyContainerOption: EnvoyDockerContainerOption,
    namespace: string,
  ) {
    this._namespace = namespace.replace(/^(.+)\.$/, '$1');
  }

  async create<T = [MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>(model: RunnerModel<T>): Promise<AsyncReturn<Error, RunnerModel<T>>> {
    const dockerLabelParser = new DockerLabelParser(model.label);
    const [parseError] = dockerLabelParser.parseLabel();
    if (parseError) {
      return [parseError];
    }

    const [mystModelError, mystModelData] = DockerRunnerCreateEnvoyRepository._getMystIdentityModel(dockerLabelParser);
    if (mystModelError) {
      return [mystModelError];
    }

    const [vpnModelError, vpnModelData] = DockerRunnerCreateEnvoyRepository._getVpnProviderModel(dockerLabelParser);
    if (vpnModelError) {
      return [vpnModelError];
    }

    const [proxyDownstreamModelError, proxyDownstreamModelData] = DockerRunnerCreateEnvoyRepository._getProxyDownstreamModel(dockerLabelParser);
    if (proxyDownstreamModelError) {
      return [proxyDownstreamModelError];
    }

    try {
      const {serial: mystContainerId, ip: mystContainerIp} = await this._getMystContainerId(dockerLabelParser);

      const containerLabel = dockerLabelParser.convertLabelToObject(this._namespace, []);
      const id = this._identity.generateId();
      const name = model.name;

      const container = await this._docker.createContainer({
        Image: this._envoyContainerOption.imageName,
        name,
        Labels: {
          [`${this._namespace}.id`]: id,
          [`${this._namespace}.project`]: RunnerServiceEnum.ENVOY,
          [`${this._namespace}.create-by`]: 'api',
          ...containerLabel,
          autoheal: 'true',
        },
        Env: [
          `NODE_PROXY_PORT=${model.socketPort}`,
          `ENABLE_WAIT_STARTUP=${this._envoyContainerOption.isEnableWaitStartup ? 'true' : 'false'}`,
          `ENABLE_WAIT_STARTUP=${this._envoyContainerOption.isEnableWaitHealthcheck ? 'true' : 'false'}`,
        ],
        HostConfig: {
          Binds: [
            `/etc/localtime:/etc/localtime:ro`,
            `${this._envoyContainerOption.hostVolumeConfigName}:/etc/envoy/`,
          ],
          NetworkMode: `container:${mystContainerId}`,
          RestartPolicy: {
            Name: 'always',
          },
          LogConfig: {
            Type: 'json-file',
            Config: {
              'max-file': '2',
              'max-size': '2g',
            },
          },
        },
        NetworkingConfig: {},
      });

      await container.start();

      const result = new RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>({
        id,
        serial: container.id,
        name,
        service: RunnerServiceEnum.ENVOY,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: mystContainerIp,
        socketPort: this._envoyContainerOption.defaultPort,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      result.label = [
        {
          $namespace: MystIdentityModel.name,
          id: mystModelData.id,
        },
        {
          $namespace: VpnProviderModel.name,
          id: vpnModelData.id,
        },
        {
          $namespace: ProxyDownstreamModel.name,
          id: proxyDownstreamModelData.id,
        },
      ];

      return [null, <RunnerModel<T>><any>result];
    } catch (error) {
      if (error instanceof NotRunningServiceException) {
        return [error];
      }

      return [new RepositoryException(error)];
    }
  }

  private static _getMystIdentityModel(dockerLabelParser: DockerLabelParser<any>): Return<Error, MystIdentityModel> {
    const [mystModelError, mystModelData] = dockerLabelParser.getClassInstance<MystIdentityModel>(MystIdentityModel);
    if (mystModelError) {
      return [mystModelError];
    }

    const mystIdentityModel = <defaultModelType<MystIdentityModel>><unknown>mystModelData;
    if (mystIdentityModel.isDefaultProperty('id')) {
      return [new FillDataRepositoryException<MystIdentityModel>(['id'])];
    }

    return [null, mystModelData];
  }

  private static _getVpnProviderModel(dockerLabelParser: DockerLabelParser<any>): Return<Error, VpnProviderModel> {
    const [vpnModelError, vpnModelData] = dockerLabelParser.getClassInstance<VpnProviderModel>(VpnProviderModel);
    if (vpnModelError) {
      return [vpnModelError];
    }

    const vpnProviderModel = <defaultModelType<VpnProviderModel>><unknown>vpnModelData;
    if (vpnProviderModel.isDefaultProperty('id')) {
      return [new FillDataRepositoryException<VpnProviderModel>(['id'])];
    }

    return [null, vpnModelData];
  }

  private static _getProxyDownstreamModel(dockerLabelParser: DockerLabelParser<any>): Return<Error, ProxyDownstreamModel> {
    const [proxyModelError, proxyModelData] = dockerLabelParser.getClassInstance<ProxyDownstreamModel>(ProxyDownstreamModel);
    if (proxyModelError) {
      return [proxyModelError];
    }

    const proxyDownstreamModel = <defaultModelType<ProxyDownstreamModel>><unknown>proxyModelData;
    if (proxyDownstreamModel.isDefaultProperty('id')) {
      return [new FillDataRepositoryException<ProxyDownstreamModel>(['id'])];
    }

    return [null, proxyModelData];
  }

  private async _getMystContainerId(dockerLabelParser: DockerLabelParser<any>): Promise<{ serial: string, ip: string }> {
    const containerIdentityLabel = dockerLabelParser.convertLabelToObjectAndPick<MystIdentityModel>(
      this._namespace,
      MystIdentityModel,
      ['identity', 'passphrase'],
    );
    const searchLabelList = Object.keys(containerIdentityLabel).map((v) => `${v}=${containerIdentityLabel[v]}`);
    const filtersObj = {
      label: [
        `${this._namespace}.project=${RunnerServiceEnum.MYST}`,
        ...searchLabelList,
      ],
    };

    const containerList = await this._docker.listContainers({
      all: false,
      filters: JSON.stringify(filtersObj),
    });
    if (containerList.length === 0) {
      throw new NotRunningServiceException();
    }

    return {
      serial: containerList[0].Id,
      ip: containerList[0].NetworkSettings.Networks[this._envoyContainerOption.networkName].IPAddress,
    };
  }
}
