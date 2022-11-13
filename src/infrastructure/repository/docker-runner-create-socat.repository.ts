import {ICreateRunnerRepository} from '@src-core/interface/i-create-runner-repository';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {AsyncReturn, Return} from '@src-core/utility';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';
import Docker = require('dockerode');
import {DockerLabelParser} from '@src-infrastructure/utility/docker-label-parser';
import {defaultModelType} from '@src-core/model/defaultModel';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import {NotRunningServiceException} from '@src-core/exception/not-running-service.exception';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {setTimeout} from 'timers/promises';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {PortInUseException} from '@src-core/exception/port-in-use.exception';

type SocatDockerContainerOption = {
  imageName: string,
  envoyDefaultPort: number,
  networkName: string,
}

type CreateContainerOutput = {
  id: string,
  serial: string,
  name: string,
  port: number,
}

export class DockerRunnerCreateSocatRepository implements ICreateRunnerRepository {
  readonly serviceType: RunnerServiceEnum = RunnerServiceEnum.SOCAT;

  private readonly _maxRetry: number = 3;
  private readonly _socatPrivatePort: number = 1234;
  private readonly _namespace: string;

  constructor(
    private readonly _docker: Docker,
    private readonly _identity: IIdentifier,
    private readonly _socatContainerOption: SocatDockerContainerOption,
    private readonly _startPortBinding: number,
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

    const [mystModelError, mystModelData] = DockerRunnerCreateSocatRepository._getMystIdentityModel(dockerLabelParser);
    if (mystModelError) {
      return [mystModelError];
    }

    const [vpnModelError, vpnModelData] = DockerRunnerCreateSocatRepository._getVpnProviderModel(dockerLabelParser);
    if (vpnModelError) {
      return [vpnModelError];
    }

    const [proxyUpstreamModelError, proxyUpstreamModelData] = DockerRunnerCreateSocatRepository._getProxyUpstreamModel(dockerLabelParser);
    if (proxyUpstreamModelError) {
      return [proxyUpstreamModelError];
    }

    const [mystContainerError, mystContainerIpData] = await this._getMystContainerIp(dockerLabelParser);
    if (mystContainerError) {
      return [mystContainerError];
    }

    const containerLabel = dockerLabelParser.convertLabelToObject(this._namespace, []);
    const createModel = <RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>><unknown>model;
    const [createError, createData] = await (model.socketPort
        ? this._createContainer(createModel, containerLabel, mystContainerIpData, model.socketPort)
        : this._createContainerWithoutPort(createModel, containerLabel, mystContainerIpData)
    );
    if (createError) {
      return [createError];
    }

    const result = new RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>({
      id: createData.id,
      serial: createData.serial,
      name: createData.name,
      service: RunnerServiceEnum.SOCAT,
      exec: RunnerExecEnum.DOCKER,
      socketType: RunnerSocketTypeEnum.TCP,
      socketPort: createData.port,
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
        $namespace: ProxyUpstreamModel.name,
        id: proxyUpstreamModelData.id,
      },
    ];

    return [null, <RunnerModel<T>><unknown>result];
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

  private static _getProxyUpstreamModel(dockerLabelParser: DockerLabelParser<any>): Return<Error, ProxyUpstreamModel> {
    const [proxyModelError, proxyModelData] = dockerLabelParser.getClassInstance<ProxyUpstreamModel>(ProxyUpstreamModel);
    if (proxyModelError) {
      return [proxyModelError];
    }

    const proxyUpstreamModel = <defaultModelType<ProxyUpstreamModel>><unknown>proxyModelData;
    if (proxyUpstreamModel.isDefaultProperty('id')) {
      return [new FillDataRepositoryException<ProxyUpstreamModel>(['id'])];
    }

    return [null, proxyModelData];
  }

  private async _getMystContainerIp(dockerLabelParser: DockerLabelParser<any>): Promise<AsyncReturn<Error, string>> {
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

    try {
      const containerList = await this._docker.listContainers({
        all: false,
        filters: JSON.stringify(filtersObj),
      });
      if (containerList.length === 0) {
        return [new NotRunningServiceException()];
      }

      const ipAddress = containerList[0].NetworkSettings.Networks[this._socatContainerOption.networkName].IPAddress;

      return [null, ipAddress];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  private async _createContainerWithoutPort(
    model: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>,
    containerLabel,
    mystContainerIp,
  ): Promise<AsyncReturn<Error, CreateContainerOutput>> {
    let result;
    let error;

    const totalTryList = new Array(this._maxRetry).fill(null);
    for await (const tryCount of totalTryList) {
      const [bindPortError, bindPortData] = await this._getNextBindPort();
      if (bindPortError) {
        error = bindPortError;
        break;
      }

      const [createError, createModel] = await this._createContainer(model, containerLabel, mystContainerIp, bindPortData);
      if (createError) {
        if (createError instanceof PortInUseException) {
          const wait = Math.floor(Math.random() * 4) + 1;
          await setTimeout(wait * 1000, 'resolved');

          continue;
        }

        error = createError;
        break;
      }

      result = createModel;
      break;
    }

    if (result) {
      return [null, result];
    }

    if (error) {
      return [error];
    }

    return [new UnknownException()];
  }

  private async _getNextBindPort(): Promise<AsyncReturn<Error, number>> {
    const filtersObj = {
      label: [
        `${this._namespace}.project=${RunnerServiceEnum.SOCAT}`,
      ],
    };

    try {
      const containerList = await this._docker.listContainers({
        all: false,
        filters: JSON.stringify(filtersObj),
      });
      if (containerList.length === 0) {
        return [null, this._startPortBinding];
      }

      let lastPortInUse = this._startPortBinding;
      for (const container of containerList) {
        lastPortInUse = container.Ports.find((v) => v.PrivatePort === this._socatPrivatePort).PublicPort;
      }

      return [null, lastPortInUse + 1];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  private async _createContainer(
    model: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>,
    containerLabel,
    mystContainerIp,
    bindPort: number,
  ): Promise<AsyncReturn<Error, CreateContainerOutput>> {
    const id = this._identity.generateId();
    const name = model.name;

    try {
      const container = await this._docker.createContainer({
        Image: this._socatContainerOption.imageName,
        name,
        Cmd: [`TCP-LISTEN:${this._socatPrivatePort},fork`, `TCP:${mystContainerIp}:${this._socatContainerOption.envoyDefaultPort}`],
        Labels: {
          [`${this._namespace}.id`]: id,
          [`${this._namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${this._namespace}.create-by`]: 'api',
          ...containerLabel,
          autoheal: 'true',
        },
        HostConfig: {
          Binds: [
            `/etc/localtime:/etc/localtime:ro`,
          ],
          PortBindings: {
            [`${this._socatPrivatePort}/tcp`]: {
              HostPort: bindPort,
            },
          },
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [this._socatContainerOption.networkName]: {},
          },
        },
      });

      await container.start();

      const result: CreateContainerOutput = {
        id,
        serial: container.id,
        name,
        port: bindPort,
      };

      return [null, result];
    } catch (error) {
      if ('json' in error && error['json']['message'].match(/port is already allocated/)) {
        return [new PortInUseException()];
      }

      return [new RepositoryException(error)];
    }
  }
}
