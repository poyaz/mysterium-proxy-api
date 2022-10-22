import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {AsyncReturn} from '@src-core/utility';
import {FilterInstanceType, FilterModel} from '@src-core/model/filter.model';
import {
  RunnerExecEnum,
  RunnerLabelNamespace,
  RunnerModel,
  RunnerServiceEnum,
  RunnerServiceVolumeEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {ICreateRunnerRepository} from '@src-core/interface/i-create-runner-repository';
import {DockerLabelParser} from '@src-infrastructure/utility/docker-label-parser';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import {RepositoryException} from '@src-core/exception/repository.exception';
import Dockerode, {NetworkInfo} from 'dockerode';
import Docker = require('dockerode');
import {filterAndSortRunner} from '@src-infrastructure/utility/filterAndSortRunner';

export type dockerContainerOption = {
  baseVolumePath: { myst: string },
  networkName: string,
}

export class DockerRunnerRepository implements IRunnerRepositoryInterface {
  private readonly _namespace: string;

  constructor(
    private readonly _docker: Docker,
    private readonly _createDockerRepository: ICreateRunnerRepository,
    private readonly _containerOption: dockerContainerOption,
    namespace: string,
  ) {
    this._namespace = namespace.replace(/^(.+)\.$/, '$1');
  }

  async getAll<T = string>(filter: FilterModel<RunnerModel<T>>): Promise<AsyncReturn<Error, Array<RunnerModel<T>>>> {
    const filtersObj = {
      name: [],
      label: [],
    };

    if (filter.getLengthOfCondition() > 0) {
      const getName = filter.getCondition('name');
      if (getName) {
        filtersObj.name.push(`/${(<FilterInstanceType<RunnerModel>><any>getName).name}`);
      }

      const getService = filter.getCondition('service');
      if (getService) {
        filtersObj.label.push(`${this._namespace}.project=${(<FilterInstanceType<RunnerModel>><any>getService).service}`);
      }

      const getLabel = filter.getCondition('label');
      if (getLabel) {
        const labelData = (<FilterInstanceType<RunnerModel>><any>getLabel).label;
        const labelList = Array.isArray(labelData) ? labelData : [labelData];

        const dockerLabelParser = new DockerLabelParser(<RunnerLabelNamespace<T>><any>labelList);
        const [parseError] = dockerLabelParser.parseLabel();
        if (parseError) {
          return [parseError];
        }

        const labelModelFilter = dockerLabelParser.convertLabelToObject<T>(this._namespace, [<any><keyof MystIdentityModel>'passphrase']);
        filtersObj.label.push(...Object.keys(labelModelFilter).map((v) => `${v}=${labelModelFilter[v]}`));
      }
    }

    try {
      const containerFetchList = await this._docker.listContainers({
        all: true,
        filters: JSON.stringify(filtersObj),
      });
      if (containerFetchList.length === 0) {
        return [null, [], 0];
      }

      const networkDependencyObj = await this._getAllNetworkDependency(containerFetchList);

      const data = containerFetchList.map((v) => this._fillModel<T>(v, networkDependencyObj));

      const result = filterAndSortRunner<T>(data, filter);

      return [null, ...result];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async getById<T = string>(id: string): Promise<AsyncReturn<Error, RunnerModel<T> | null>> {
    const filtersObj = {
      label: [`${this._namespace}.id=${id}`],
    };

    try {
      const containerFetchList = await this._docker.listContainers({
        all: true,
        filters: JSON.stringify(filtersObj),
      });
      if (containerFetchList.length === 0) {
        return [null, null];
      }

      const networkDependencyObj = await this._getAllNetworkDependency(containerFetchList);

      const result = this._fillModel<T>(containerFetchList[0], networkDependencyObj);

      return [null, result];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async create<T = string>(model: RunnerModel<T>): Promise<AsyncReturn<Error, RunnerModel<T>>> {
    return this._createDockerRepository.create<T>(model);
  }

  restart(id: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  reload(id: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  remove(id: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  removeStopService(): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  private async _getAllNetworkDependency(containerList: Array<Dockerode.ContainerInfo>): Promise<Record<string, NetworkInfo>> {
    const networkDependencyContainerList = [];
    for (const container of containerList) {
      const [, dependencyContainerId] = /^container:(.+)/.exec(container.HostConfig.NetworkMode) || [null, null];
      if (dependencyContainerId) {
        networkDependencyContainerList.push(dependencyContainerId);
      }
    }

    const dependencyContainerFetchObj = {};
    if (networkDependencyContainerList.length === 0) {
      return dependencyContainerFetchObj;
    }

    const dependencyContainerFetchList = await this._docker.listContainers({
      all: true,
      filters: JSON.stringify({id: networkDependencyContainerList}),
    });

    for (const container of dependencyContainerFetchList) {
      const networks = container.NetworkSettings.Networks;
      const networkKeys = Object.keys(networks);

      for (const network of networkKeys) {
        dependencyContainerFetchObj[`container:${container.Id}`] = networks[network];
      }
    }

    return dependencyContainerFetchObj;
  }

  private _fillModel<T>(row: Dockerode.ContainerInfo, networkDependencyObj: Record<string, NetworkInfo>) {
    let service: RunnerServiceEnum;
    let socketType: RunnerSocketTypeEnum;
    let socketUri: string;
    let socketPort: number;
    let status: RunnerStatusEnum;

    switch (row.Labels[`${this._namespace}.project`]) {
      case RunnerServiceEnum.MYST:
        service = RunnerServiceEnum.MYST;
        socketType = RunnerSocketTypeEnum.HTTP;
        socketPort = 4449;
        break;
      case RunnerServiceEnum.MYST_CONNECT:
        service = RunnerServiceEnum.MYST_CONNECT;
        socketType = RunnerSocketTypeEnum.NONE;
        socketPort = null;
        break;
      case RunnerServiceEnum.ENVOY:
        service = RunnerServiceEnum.ENVOY;
        socketType = RunnerSocketTypeEnum.HTTP;
        socketPort = 10001;
        break;
      case RunnerServiceEnum.SQUID:
        service = RunnerServiceEnum.SQUID;
        socketType = RunnerSocketTypeEnum.NONE;
        socketPort = null;
        break;
      default:
        throw new FillDataRepositoryException<RunnerModel>(['service']);
    }

    switch (row.State) {
      case RunnerStatusEnum.CREATING:
        status = RunnerStatusEnum.CREATING;
        break;
      case RunnerStatusEnum.RUNNING:
        status = RunnerStatusEnum.RUNNING;
        break;
      case RunnerStatusEnum.RESTARTING:
        status = RunnerStatusEnum.RESTARTING;
        break;
      case RunnerStatusEnum.EXITED:
        status = RunnerStatusEnum.EXITED;
        break;
      case RunnerStatusEnum.FAILED:
        status = RunnerStatusEnum.FAILED;
        break;
      default:
        throw new FillDataRepositoryException<RunnerModel>(['status']);
    }

    if (this._containerOption.networkName in row.NetworkSettings.Networks) {
      socketUri = row.NetworkSettings.Networks[this._containerOption.networkName].IPAddress;
    } else if (row.HostConfig.NetworkMode in networkDependencyObj) {
      socketUri = networkDependencyObj[row.HostConfig.NetworkMode].IPAddress;
    } else {
      socketUri = null;
    }

    return new RunnerModel<T>({
      id: row.Labels[`${this._namespace}.id`],
      serial: row.Id,
      name: row.Names[0].replace(/^\/(.+)/, '$1'),
      service,
      exec: RunnerExecEnum.DOCKER,
      socketType,
      socketUri,
      socketPort,
      label: DockerLabelParser.convertObjectToLabel(this._namespace, row.Labels),
      volumes: row.Mounts.map((v) => ({
        source: v.Source,
        dest: v.Destination,
        ...(v.Destination.search(this._containerOption.baseVolumePath.myst) !== -1 && {name: RunnerServiceVolumeEnum.MYST_KEYSTORE}),
      })),
      status,
      insertDate: new Date(row.Created * 1000),
    });
  }
}