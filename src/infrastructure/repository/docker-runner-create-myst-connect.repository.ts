import {ICreateRunnerRepositoryInterface} from '@src-core/interface/i-create-runner-repository.interface';
import {
  RunnerExecEnum,
  RunnerLabelNamespace,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum, RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {AsyncReturn, Return} from '@src-core/utility';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import Docker = require('dockerode');
import {DockerLabelParser} from '@src-infrastructure/utility/docker-label-parser';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {defaultModelType} from '@src-core/model/defaultModel';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {NotRunningServiceException} from '@src-core/exception/not-running-service.exception';

type MystDockerContainerOption = {
  imageName: string,
  networkName: string,
}

type RedisOption = {
  host: string,
  port: number,
  db?: number,
}

export class DockerRunnerCreateMystConnectRepository implements ICreateRunnerRepositoryInterface {
  readonly serviceType: RunnerServiceEnum = RunnerServiceEnum.MYST_CONNECT;
  private readonly _MYST_API_BASE_ADDRESS = 'http://127.0.0.1:4050';
  private readonly _REDIS_PROVIDER_INFO_KEY = 'myst_provider:info:all';

  private readonly _namespace: string;

  constructor(
    private readonly _docker: Docker,
    private readonly _identity: IIdentifier,
    private readonly _mystContainerOption: MystDockerContainerOption,
    private readonly _redisConnection: RedisOption,
    namespace: string,
  ) {
    this._namespace = namespace.replace(/^(.+)\.$/, '$1');
  }

  async create<T = string>(model: RunnerModel<T>): Promise<AsyncReturn<Error, RunnerModel<T>>> {
    const dockerLabelParser = new DockerLabelParser(model.label);
    const [parseError] = dockerLabelParser.parseLabel();
    if (parseError) {
      return [parseError];
    }

    const [mystModelError, mystModelData] = DockerRunnerCreateMystConnectRepository._getMystIdentityModel(dockerLabelParser);
    if (mystModelError) {
      return [mystModelError];
    }

    const [vpnModelError, vpnModelData] = DockerRunnerCreateMystConnectRepository._getVpnProviderModel(dockerLabelParser);
    if (vpnModelError) {
      return [vpnModelError];
    }

    try {
      const mystContainerId = await this._getMystContainerId(dockerLabelParser);

      const containerLabel = dockerLabelParser.convertLabelToObject(this._namespace, []);
      const id = this._identity.generateId();
      const name = model.name;

      const container = await this._docker.createContainer({
        Image: this._mystContainerOption.imageName,
        name,
        Labels: {
          [`${this._namespace}.id`]: id,
          [`${this._namespace}.project`]: RunnerServiceEnum.MYST_CONNECT,
          [`${this._namespace}.create-by`]: 'api',
          ...containerLabel,
          autoheal: 'true',
        },
        Env: [
          `MYST_API_BASE_ADDRESS=${this._MYST_API_BASE_ADDRESS.replace(/(.+)\/?$/, '$1')}`,
          `MYST_IDENTITY=${mystModelData.identity}`,
          `PROVIDER_IDENTITY=${vpnModelData.providerIdentity}`,
          `API_PROVIDER_ID=${vpnModelData.id}`,
          `REDIS_HOST=${this._redisConnection.host}`,
          `REDIS_PORT=${this._redisConnection.port}`,
          `REDIS_DB=${this._redisConnection.db}`,
          `REDIS_PROVIDER_INFO_KEY=${this._REDIS_PROVIDER_INFO_KEY}`,
        ],
        HostConfig: {
          Binds: [
            `/etc/localtime:/etc/localtime:ro`,
          ],
          NetworkMode: `container:${mystContainerId}`,
          RestartPolicy: {
            Name: 'always',
          },
          LogConfig: {
            Type: 'json-file',
            Config: {
              'max-file': '2',
              'max-size': '1g',
            },
          },
        },
        NetworkingConfig: {},
      });

      await container.start();

      const result = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id,
        serial: container.id,
        name,
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.NONE,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      result.label = [
        {
          $namespace: MystIdentityModel.name,
          id: mystModelData.id,
          identity: mystModelData.identity,
        },
        {
          $namespace: VpnProviderModel.name,
          id: vpnModelData.id,
          userIdentity: vpnModelData.userIdentity || mystModelData.identity,
          providerIdentity: vpnModelData.providerIdentity,
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
    if (mystIdentityModel.isDefaultProperty('identity')) {
      return [new FillDataRepositoryException<MystIdentityModel>(['identity'])];
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
    if (
      vpnProviderModel.isDefaultProperty('userIdentity')
      || (!vpnProviderModel.isDefaultProperty('userIdentity') && !vpnProviderModel.userIdentity)
    ) {
      return [new FillDataRepositoryException<VpnProviderModel>(['userIdentity'])];
    }
    if (vpnProviderModel.isDefaultProperty('providerIdentity')) {
      return [new FillDataRepositoryException<VpnProviderModel>(['providerIdentity'])];
    }

    return [null, vpnModelData];
  }

  private async _getMystContainerId(dockerLabelParser: DockerLabelParser<any>) {
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

    return containerList[0].Id;
  }
}
