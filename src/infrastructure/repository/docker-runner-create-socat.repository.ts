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
import {IPv4CidrRange} from 'ip-num';
import {EndpointSettings} from 'dockerode';

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

export class DockerRunnerCreateSocatRepository implements ICreateRunnerRepositoryInterface {
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
    const [createError, createData] = await this._createContainer(
      createModel,
      containerLabel,
      mystContainerIpData,
      model.socketPort,
    );

    if (createError) {
      if (
        createError instanceof RepositoryException
        && 'isContainerCreated' in createError.additionalInfo
        && createError.additionalInfo['isContainerCreated'] === true) {
        await this._removeCreatedContainerById(createError.additionalInfo['containerId']);
      }

      if (
        createError instanceof RepositoryException
        && 'json' in createError.additionalInfo
        && createError.additionalInfo['json']['message'].match(/port is already allocated/)
      ) {
        return [new PortInUseException()];
      }

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
        userIdentity: vpnModelData.userIdentity,
        providerIdentity: vpnModelData.providerIdentity,
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
    if (vpnProviderModel.isDefaultProperty('userIdentity')) {
      return [new FillDataRepositoryException<VpnProviderModel>(['userIdentity'])];
    }
    if (vpnProviderModel.isDefaultProperty('providerIdentity')) {
      return [new FillDataRepositoryException<VpnProviderModel>(['providerIdentity'])];
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

  private async _getNextNetworkIp(): Promise<AsyncReturn<Error, string>> {
    try {
      const network = await this._docker.getNetwork(this._socatContainerOption.networkName);
      const data = await network.inspect();

      const networkContainerList = data.Containers;
      const bindIpObj: Record<string, null> = {
        [data.IPAM.Config[0].Subnet.split('/')[0]]: null,
        [data.IPAM.Config[0].Gateway]: null,
      };

      Object.keys(networkContainerList).map((v) => (bindIpObj[networkContainerList[v].IPv4Address.split('/')[0]] = null));

      const ipv4Range = IPv4CidrRange.fromCidr(data.IPAM.Config[0].Subnet);
      const nextIpAddress = ipv4Range
        .take(ipv4Range.getSize())
        .map((v) => v.toString())
        .find((v) => !(v in bindIpObj));

      if (!nextIpAddress) {
        return [new FillDataRepositoryException<EndpointSettings>(['IPAddress'])];
      }

      return [null, nextIpAddress];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  private async _createContainer(createModel, containerLabel, mystContainerIpData, socketPort): Promise<AsyncReturn<Error, CreateContainerOutput>> {
    let error;
    let result;

    const totalTryList = new Array(this._maxRetry).fill(null);
    for await (const tryCount of totalTryList) {
      const [removeCreatedContainerError] = await this._removeFailedContainerByName(createModel.name);
      if (removeCreatedContainerError) {
        return [removeCreatedContainerError];
      }

      const [createError, createData] = await (socketPort
          ? this._createContainerWithPort(createModel, containerLabel, mystContainerIpData, socketPort)
          : this._createContainerWithoutPort(createModel, containerLabel, mystContainerIpData)
      );

      if (createError) {
        if (
          createError instanceof RepositoryException
          && 'json' in createError.additionalInfo
          && createError.additionalInfo['json']['message'] === 'Address already in use'
        ) {
          const wait = Math.floor(Math.random() * 4) + 1;
          await setTimeout(wait * 1000, 'resolved');

          continue;
        }

        error = createError;
        break;
      }

      result = createData;
      break;
    }

    if (error) {
      return [error];
    }

    return [null, result];
  }

  private async _getNextBindPort(portInUseList: Array<number>): Promise<AsyncReturn<Error, number>> {
    const filtersObj = {
      label: [
        `${this._namespace}.project=${RunnerServiceEnum.SOCAT}`,
        `${this._namespace}.publish-port`,
      ],
    };

    try {
      const containerList = await this._docker.listContainers({
        all: true,
        filters: JSON.stringify(filtersObj),
      });
      if (containerList.length === 0) {
        return [null, this._startPortBinding];
      }

      for (const container of containerList) {
        portInUseList.push(Number(container.Labels[`${this._namespace}.publish-port`]));
      }

      portInUseList.sort();

      let previousPort = portInUseList[0];
      let nextPort;

      if (this._startPortBinding < previousPort) {
        return [null, this._startPortBinding];
      }

      for (let i = 0; i < portInUseList.length; i++) {
        const diff = portInUseList[i] - previousPort;
        if (diff === 0) {
          previousPort = portInUseList[i];
          nextPort = portInUseList[i + 1];
        }
        if (diff > 1) {
          nextPort = previousPort + diff - 1;
          break;
        }

        previousPort = portInUseList[i];
        nextPort = portInUseList[i + 1];
      }

      if (!nextPort) {
        return [null, previousPort + 1];
      }
      if (nextPort === portInUseList.at(-1)) {
        return [null, nextPort + 1];
      }

      return [null, nextPort];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  private async _createContainerWithoutPort(
    model: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>,
    containerLabel,
    mystContainerIp,
  ): Promise<AsyncReturn<Error, CreateContainerOutput>> {
    const totalTryList = new Array(this._maxRetry).fill(null);
    const portInUseList = [];
    let lastPortInUseContainerId;
    let result;
    let error;

    for await (const tryCount of totalTryList) {
      const [bindPortError, bindPortData] = await this._getNextBindPort(portInUseList);
      if (bindPortError) {
        error = bindPortError;
        break;
      }

      const [createError, createModel] = await this._createContainerWithPort(model, containerLabel, mystContainerIp, bindPortData);
      if (createError) {
        if (
          createError instanceof RepositoryException
          && 'json' in createError.additionalInfo
          && createError.additionalInfo['json']['message'].match(/port is already allocated/)
        ) {
          if ('containerId' in createError.additionalInfo) {
            lastPortInUseContainerId = createError.additionalInfo['containerId'];
          }

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

    if (lastPortInUseContainerId) {
      await this._removeCreatedContainerById(lastPortInUseContainerId);
    }

    if (error) {
      return [error];
    }

    return [new UnknownException()];
  }

  private async _createContainerWithPort(
    model: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>,
    containerLabel,
    mystContainerIp,
    bindPort: number,
  ): Promise<AsyncReturn<Error, CreateContainerOutput>> {
    const id = this._identity.generateId();
    const name = model.name;

    const [removeFailedContainerError] = await this._removeFailedContainerByName(name);
    if (removeFailedContainerError) {
      return [removeFailedContainerError];
    }

    const [networkError, networkIp] = await this._getNextNetworkIp();
    if (networkError) {
      return [networkError];
    }

    const containerInfo = {isCreated: false, containerId: null};
    try {
      const container = await this._docker.createContainer({
        Image: this._socatContainerOption.imageName,
        name,
        Cmd: [`TCP-LISTEN:${this._socatPrivatePort},fork`, `TCP:${mystContainerIp}:${this._socatContainerOption.envoyDefaultPort}`],
        Labels: {
          [`${this._namespace}.id`]: id,
          [`${this._namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${this._namespace}.create-by`]: 'api',
          [`${this._namespace}.publish-port`]: bindPort.toString(),
          ...containerLabel,
          autoheal: 'true',
        },
        ExposedPorts: {
          [`${this._socatPrivatePort}/tcp`]: {},
        },
        HostConfig: {
          Binds: [
            `/etc/localtime:/etc/localtime:ro`,
          ],
          PortBindings: {
            [`${this._socatPrivatePort}/tcp`]: [{HostPort: bindPort.toString()}],
          },
          NetworkMode: 'bridge',
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
        NetworkingConfig: {
          EndpointsConfig: {
            [this._socatContainerOption.networkName]: {
              IPAMConfig: {
                IPv4Address: networkIp,
              },
            },
          },
        },
      });

      containerInfo.containerId = container.id;
      containerInfo.isCreated = true;

      await container.start();

      const result: CreateContainerOutput = {
        id,
        serial: container.id,
        name,
        port: bindPort,
      };

      return [null, result];
    } catch (error) {
      error['containerId'] = containerInfo.containerId;
      error['isContainerCreated'] = containerInfo.isCreated;

      return [new RepositoryException(error)];
    }
  }

  private async _removeFailedContainerByName(name: string): Promise<AsyncReturn<Error, null>> {
    const filtersObj = {
      name: [name],
      status: ['created'],
      label: [
        `${this._namespace}.project=${RunnerServiceEnum.SOCAT}`,
        `${this._namespace}.publish-port`,
      ],
    };

    try {
      const containerList = await this._docker.listContainers({
        all: true,
        filters: JSON.stringify(filtersObj),
      });
      if (containerList.length === 0) {
        return [null, null];
      }

      const container = await this._docker.getContainer(containerList[0].Id);
      const info = await container.inspect();

      if (info.State.ExitCode === 128 && info.State.Error.match(/port is already allocated/)) {
        await container.remove({v: true, force: true});
      }

      return [null, null];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  private async _removeCreatedContainerById(serialId: string): Promise<AsyncReturn<Error, null>> {
    try {
      const container = await this._docker.getContainer(serialId);

      await container.remove({v: true, force: true});

      return [null, null];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }
}
