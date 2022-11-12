import {ICreateRunnerRepository} from '@src-core/interface/i-create-runner-repository';
import {RunnerModel, RunnerServiceEnum} from '@src-core/model/runner.model';
import {AsyncReturn, Return} from '@src-core/utility';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {ProxyDownstreamModel, ProxyUpstreamModel} from '@src-core/model/proxy.model';
import Docker = require('dockerode');
import {DockerLabelParser} from '@src-infrastructure/utility/docker-label-parser';
import {defaultModelType} from '@src-core/model/defaultModel';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import {NotRunningServiceException} from '@src-core/exception/not-running-service.exception';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {setTimeout} from 'timers/promises';
import {UnknownException} from '@src-core/exception/unknown.exception';

type SocatDockerContainerOption = {
  imageName: string,
  envoyDefaultPort: number,
  networkName: string,
}

export class DockerRunnerCreateSocatRepository implements ICreateRunnerRepository {
  readonly serviceType: RunnerServiceEnum = RunnerServiceEnum.SOCAT;

  private readonly _maxRetry: number = 3;
  private readonly _namespace: string;

  constructor(
    private readonly _docker: Docker,
    private readonly _identity: IIdentifier,
    private readonly _envoyContainerOption: SocatDockerContainerOption,
    namespace: string,
  ) {
    this._namespace = namespace.replace(/^(.+)\.$/, '$1');
  }

  async create<T = [MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>(model: RunnerModel<T>): Promise<AsyncReturn<Error, RunnerModel<T>>> {
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

    return [null, null];
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

      const ipAddress = containerList[0].NetworkSettings.Networks[this._envoyContainerOption.networkName].IPAddress;

      return [null, ipAddress];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  private async _createContainerWithoutPort(
    model: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>,
    containerLabel,
    mystContainerIp,
  ): Promise<AsyncReturn<Error, string>> {
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
        if (
          createError instanceof RepositoryException
          && 'json' in createError.additionalInfo
          && createError.additionalInfo['json']['message'].match(/port is already allocated/)
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

    if (error) {
      return [error];
    }

    return [new UnknownException()];
  }

  private async _getNextBindPort(): Promise<AsyncReturn<Error, number>> {
    return [null, 0];
  }

  private async _createContainer(
    model: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>,
    containerLabel,
    mystContainerIp,
    bindPort: number,
  ): Promise<AsyncReturn<Error, string>> {
    return [null, null];
  }
}
