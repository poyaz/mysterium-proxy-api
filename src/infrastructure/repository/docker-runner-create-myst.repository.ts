import {Injectable} from '@nestjs/common';
import {ICreateRunnerRepository} from '@src-core/interface/i-create-runner-repository';
import {
  RunnerExecEnum,
  RunnerLabelNamespace,
  RunnerModel,
  RunnerServiceEnum,
  RunnerServiceVolumeEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {AsyncReturn} from '@src-core/utility';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import {defaultModelType} from '@src-core/model/defaultModel';
import {DockerLabelParser} from '@src-infrastructure/utility/docker-label-parser';
import {IPv4CidrRange} from 'ip-num';
import {EndpointSettings} from 'dockerode';
import {setTimeout} from 'timers/promises';
import Docker = require('dockerode');
import * as path from 'path';

type MystDockerContainerOption = {
  imageName: string,
  httpPort: number,
  dataVolumePath: string,
  networkName: string,
  realPath: string,
}

@Injectable()
export class DockerRunnerCreateMystRepository implements ICreateRunnerRepository {
  readonly serviceType: RunnerServiceEnum = RunnerServiceEnum.MYST;

  private readonly _namespace: string;
  private readonly _maxRetry: number = 3;

  constructor(
    private readonly _docker: Docker,
    private readonly _identity: IIdentifier,
    private readonly _mystContainerOption: MystDockerContainerOption,
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
    const [modelError, modelData] = dockerLabelParser.getClassInstance<MystIdentityModel>(MystIdentityModel);
    if (modelError) {
      return [modelError];
    }
    const mystIdentityModel = <defaultModelType<MystIdentityModel>><unknown>modelData;
    if (mystIdentityModel.isDefaultProperty('id')) {
      return [new FillDataRepositoryException<MystIdentityModel>(['id'])];
    }
    if (mystIdentityModel.isDefaultProperty('identity')) {
      return [new FillDataRepositoryException<MystIdentityModel>(['identity'])];
    }
    if (mystIdentityModel.isDefaultProperty('passphrase')) {
      return [new FillDataRepositoryException<MystIdentityModel>(['passphrase'])];
    }

    const volumeName = `myst-keystore-${mystIdentityModel.identity}`;
    const [volumeExistError, isVolumeExist] = await this._isVolumeExist(volumeName);
    if (volumeExistError) {
      return [volumeExistError];
    }
    if (!isVolumeExist) {
      const volumeLabel = dockerLabelParser.convertLabelToObject(`${this._namespace}.volume`);
      const [volumeError] = await this._createVolume(model, volumeLabel, mystIdentityModel);
      if (volumeError) {
        return [volumeError];
      }
    }

    const containerLabel = dockerLabelParser.convertLabelToObject<MystIdentityModel>(this._namespace, ['passphrase']);
    let result;
    let error;

    const totalTryList = new Array(this._maxRetry).fill(null);
    for await (const tryCount of totalTryList) {
      const [removeCreatedContainerError] = await this._removeCreatedContainer(dockerLabelParser);
      if (removeCreatedContainerError) {
        return [removeCreatedContainerError];
      }

      const [createError, createModel] = await this._createContainer(model, containerLabel, volumeName, mystIdentityModel);
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

      result = createModel;
      break;
    }


    if (result) {
      return [null, result];
    }

    if (
      !error
      || (
        error instanceof RepositoryException
        && 'isContainerCreated' in error.additionalInfo
        && error.additionalInfo['isContainerCreated'] === true
      )
    ) {
      await this._removeCreatedContainer(dockerLabelParser);
    }

    if (error) {
      return [error];
    }

    return [new UnknownException()];
  }

  private async _isVolumeExist(name: string): Promise<AsyncReturn<Error, boolean>> {
    try {
      const volume = await this._docker.getVolume(name);
      await volume.inspect();

      return [null, true];
    } catch (error) {
      if ('statusCode' in error && error['statusCode'] === 404) {
        return [null, false];
      }

      return [new RepositoryException(error)];
    }
  }

  private async _createVolume<T>(model: RunnerModel<T>, volumeLabel, mystIdentityModel: MystIdentityModel) {
    const keystoreVolume = model.volumes.find((v) => v.name === RunnerServiceVolumeEnum.MYST_KEYSTORE);
    if (!keystoreVolume) {
      return [new FillDataRepositoryException<RunnerModel>(['volumes'])];
    }

    try {
      await this._docker.createVolume({
        Name: `myst-keystore-${mystIdentityModel.identity}`,
        Driver: 'local',
        DriverOpts: {
          device: keystoreVolume.source.replace(new RegExp(`^${path.resolve()}`), this._mystContainerOption.realPath),
          o: 'bind',
          type: 'none',
        },
        Labels: {
          [`${this._namespace}.create-by`]: 'api',
          ...volumeLabel,
        },
      });

      return [null];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  private async _getNextNetworkIp(): Promise<AsyncReturn<Error, string>> {
    try {
      const network = await this._docker.getNetwork(this._mystContainerOption.networkName);
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

  private async _createContainer<T>(
    model: RunnerModel<T>,
    containerLabel: Record<string, string>,
    volumeName: string,
    mystIdentityModel: MystIdentityModel,
  ): Promise<AsyncReturn<Error, RunnerModel<T>>> {
    const [networkError, networkIp] = await this._getNextNetworkIp();
    if (networkError) {
      return [networkError];
    }

    const id = this._identity.generateId();
    const name = model.name;

    const containerInfo = {isCreated: false};
    try {
      const container = await this._docker.createContainer({
        Image: this._mystContainerOption.imageName,
        name,
        Cmd: ['--auto-reconnect' , '--log-level', 'fatal', 'service', '--agreed-terms-and-conditions'],
        Labels: {
          [`${this._namespace}.id`]: id,
          [`${this._namespace}.project`]: RunnerServiceEnum.MYST,
          [`${this._namespace}.create-by`]: 'api',
          ...containerLabel,
          autoheal: 'true',
        },
        Env: [
          `MYST_IDENTITY=${mystIdentityModel.identity}`,
          `MYST_IDENTITY_PASS=${mystIdentityModel.passphrase}`,
        ],
        HostConfig: {
          Binds: [
            `/etc/localtime:/etc/localtime:ro`,
            `${volumeName}:${this._mystContainerOption.dataVolumePath}`,
          ],
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
          Devices: [
            {
              PathOnHost: '/dev/net/tun',
              PathInContainer: '/dev/net/tun',
              CgroupPermissions: 'rwm',
            },
          ],
          CapAdd: ['NET_ADMIN'],
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [this._mystContainerOption.networkName]: {
              IPAMConfig: {
                IPv4Address: networkIp,
              },
            },
          },
        },
      });

      containerInfo.isCreated = true;
      await container.start();

      const keystoreVolume = model.volumes.find((v) => v.name === RunnerServiceVolumeEnum.MYST_KEYSTORE);
      if (keystoreVolume) {
        keystoreVolume.dest = this._mystContainerOption.dataVolumePath;
      }

      const result = new RunnerModel<T>({
        id,
        serial: container.id,
        name,
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: networkIp,
        socketPort: this._mystContainerOption.httpPort,
        label: <RunnerLabelNamespace<MystIdentityModel>>{
          ...DockerLabelParser.convertObjectToLabel(this._namespace, containerLabel),
          passphrase: mystIdentityModel.passphrase,
        },
        volumes: model.volumes,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });

      return [null, result];
    } catch (error) {
      error['isContainerCreated'] = containerInfo.isCreated;

      return [new RepositoryException(error)];
    }
  }

  private async _removeCreatedContainer<T>(dockerLabelParser: DockerLabelParser<T>): Promise<AsyncReturn<Error, null>> {
    const containerIdentityLabel = dockerLabelParser.convertLabelToObject<MystIdentityModel>(this._namespace, ['id', 'passphrase']);
    const searchLabelList = Object.keys(containerIdentityLabel).map((v) => `${v}=${containerIdentityLabel[v]}`);

    const filtersObj = {
      status: ['created'],
      label: [
        `${this._namespace}.project=${RunnerServiceEnum.MYST}`,
        ...searchLabelList,
      ],
    };

    try {
      const containerList = await this._docker.listContainers({
        all: true,
        filters: JSON.stringify(filtersObj),
      });

      if (containerList.length !== 1) {
        return [null];
      }

      const container = await this._docker.getContainer(containerList[0].Id);
      await container.remove({v: true, force: true});

      return [null];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }
}
