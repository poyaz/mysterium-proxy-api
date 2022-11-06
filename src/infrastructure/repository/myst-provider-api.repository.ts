import {Injectable, Logger} from '@nestjs/common';
import {AsyncReturn} from '@src-core/utility';
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import axios from 'axios';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import {IMystApiRepositoryInterface} from '@src-core/interface/i-myst-api-repository.interface';
import {RunnerModel} from '@src-core/model/runner.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {ProviderIdentityInUseException} from '@src-core/exception/provider-identity-in-use.exception';
import {ProviderIdentityNotConnectingException} from '@src-core/exception/provider-identity-not-connecting.exception';

@Injectable()
export class MystProviderApiRepository implements IMystApiRepositoryInterface {
  private readonly _myst_api_prefix;

  constructor(
    private readonly _identifier: IIdentifier,
    myst_api_address,
    private readonly _myst_api_username,
    private readonly _myst_api_password,
    private readonly _logger: Logger,
  ) {
    this._myst_api_prefix = `${myst_api_address.replace(/^(.+)\/+$/g, '$1')}/api/v3/`;
  }

  async getAll<F>(runner: RunnerModel, filter?: F): Promise<AsyncReturn<Error, Array<VpnProviderModel>>> {
    const params = {
      service_type: VpnServiceTypeEnum.WIREGUARD,
    };
    let pageNumber = null;
    let pageSize = null;

    if (filter) {
      const filterModel = <FilterModel<VpnProviderModel>><any>filter;
      let isSkipPagination = false;

      if (filterModel.getLengthOfCondition() > 0) {
        const getCountry = filterModel.getCondition('country');
        if (getCountry) {
          params['location_country'] = getCountry.country;
        }

        const getProviderIdentity = filterModel.getCondition('providerIdentity');
        if (getProviderIdentity) {
          params['provider_id'] = getProviderIdentity.providerIdentity;
        }

        const getProviderIpType = filterModel.getCondition('providerIpType');
        if (getProviderIpType) {
          params['ip_type'] = getProviderIpType.providerIpType;
        }

        const getIsRegister = filterModel.getCondition('isRegister');
        if (getIsRegister) {
          isSkipPagination = true;
        }
      }

      if (!isSkipPagination) {
        pageNumber = filterModel.page;
        pageSize = filterModel.limit;
      }
    }

    try {
      const response = await axios.get(`${this._myst_api_prefix}/proposals`, {
        headers: {
          'content-type': 'application.json',
        },
        params,
      });
      if (!response.data) {
        return [null, [], 0];
      }

      const result = response.data.map((v) => this._fillModel(v));
      let count = result.length;

      if (pageNumber && pageSize) {
        const resultPagination = result.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

        return [null, resultPagination, count];
      } else {
        return [null, result, count];
      }

    } catch (error) {
      if (error instanceof FillDataRepositoryException) {
        return [error];
      }

      return [new RepositoryException(error)];
    }
  }

  async getById(runner: RunnerModel, id: string): Promise<AsyncReturn<Error, VpnProviderModel | null>> {
    try {
      const response = await axios.get(`${this._myst_api_prefix}/proposals`, {
        headers: {
          'content-type': 'application.json',
        },
        params: {
          service_type: VpnServiceTypeEnum.WIREGUARD,
        },
      });
      if (!response.data) {
        return [null, null];
      }

      const data = response.data.filter((v) => this._identifier.generateId(v['provider_id']) === id);

      const result = data.length === 1 ? this._fillModel(data[0]) : null;

      return [null, result];
    } catch (error) {
      if (error instanceof FillDataRepositoryException) {
        return [error];
      }

      return [new RepositoryException(error)];
    }
  }

  async connect(runner: RunnerModel, vpnProviderModel: VpnProviderModel): Promise<AsyncReturn<Error, VpnProviderModel>> {
    const hostAddr = `http://${runner.socketUri}:${runner.socketPort}`;

    const [loginError, loginToken] = await this._doLogin(hostAddr);
    if (loginError) {
      return [loginError];
    }

    try {
      await axios.put(
        `${hostAddr}/tequilapi/connection`,
        {
          consumer_id: vpnProviderModel.userIdentity,
          provider_id: vpnProviderModel.providerIdentity,
          service_type: vpnProviderModel.serviceType,
        },
        {
          headers: {
            'content-type': 'application.json',
            authorization: loginToken,
          },
        },
      );

      const [currentIpError, currentIpData] = await MystProviderApiRepository._getCurrentIp(hostAddr, loginToken);
      if (currentIpError) {
        this._logger.error(
          `Error to get ip address of provider "${vpnProviderModel.providerIdentity}"`,
          currentIpError.stack,
          this.constructor.name,
        );

        return [null, vpnProviderModel];
      }

      vpnProviderModel.ip = currentIpData;

      return [null, vpnProviderModel];
    } catch (error) {
      if (error?.response?.data?.error?.code === 'err_connection_already_exists') {
        return [new ProviderIdentityInUseException()];
      }

      return [new RepositoryException(error)];
    }
  }

  async disconnect(runner: RunnerModel, force?: boolean): Promise<AsyncReturn<Error, null>> {
    const hostAddr = `http://${runner.socketUri}:${runner.socketPort}`;

    const [loginError, loginToken] = await this._doLogin(hostAddr);
    if (loginError) {
      return [loginError];
    }

    try {
      await axios.delete(
        `${hostAddr}/tequilapi/connection`,
        {
          headers: {
            'content-type': 'application.json',
            authorization: loginToken,
          },
        },
      );

      return [null, null];
    } catch (error) {
      if (error?.response?.data?.error?.code === 'err_no_connection_exists') {
        if (force) {
          return [null, null];
        }

        return [new ProviderIdentityNotConnectingException()];
      }

      return [new RepositoryException(error)];
    }
  }

  async registerIdentity(runner: RunnerModel, userIdentity: string): Promise<AsyncReturn<Error, null>> {
    const hostAddr = `http://${runner.socketUri}:${runner.socketPort}`;

    const [loginError, loginToken] = await this._doLogin(hostAddr);
    if (loginError) {
      return [loginError];
    }

    try {
      await axios.post(
        `${hostAddr}/tequilapi/identities/${userIdentity}/register`,
        {},
        {
          headers: {
            'content-type': 'application.json',
            authorization: loginToken,
          },
        },
      );

      return [null, null];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async unlockIdentity(runner: RunnerModel, identity: MystIdentityModel): Promise<AsyncReturn<Error, null>> {
    const hostAddr = `http://${runner.socketUri}:${runner.socketPort}`;

    const [loginError, loginToken] = await this._doLogin(hostAddr);
    if (loginError) {
      return [loginError];
    }

    try {
      await axios.put(
        `${hostAddr}/tequilapi/identities/${identity.identity}/unlock`,
        {
          passphrase: identity.passphrase,
        },
        {
          headers: {
            'content-type': 'application.json',
            authorization: loginToken,
          },
        },
      );

      return [null, null];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  private _fillModel(row) {
    return new VpnProviderModel({
      id: this._identifier.generateId(row['provider_id']),
      serviceType: VpnServiceTypeEnum.WIREGUARD,
      providerName: VpnProviderName.MYSTERIUM,
      providerIdentity: row['provider_id'],
      providerIpType: MystProviderApiRepository._convertServiceType(row['location']['ip_type']),
      country: row['location']['country'],
      isRegister: false,
      quality: row['quality']['quality'],
      bandwidth: row['quality']['bandwidth'],
      latency: row['quality']['latency'],
      insertDate: new Date(),
    });
  }

  private static _convertServiceType(serviceType): VpnProviderIpTypeEnum {
    switch (serviceType) {
      case 'hosting':
        return VpnProviderIpTypeEnum.HOSTING;
      case 'residential':
        return VpnProviderIpTypeEnum.RESIDENTIAL;
      case 'business':
        return VpnProviderIpTypeEnum.BUSINESS;
      case 'mobile':
        return VpnProviderIpTypeEnum.MOBILE;
      default:
        throw new FillDataRepositoryException<VpnProviderModel>(['serviceType']);
    }
  }

  private async _doLogin(hostAddr: string): Promise<AsyncReturn<Error, string>> {
    try {
      const response = await axios.post(
        `${hostAddr}/tequilapi/auth/login`,
        {
          username: this._myst_api_username,
          password: this._myst_api_password,
        },
        {
          headers: {
            'content-type': 'application.json',
          },
        },
      );
      const token = `Bearer ${response.data.token}`;

      return [null, token];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  private static async _getCurrentIp(hostAddr: string, token: string): Promise<AsyncReturn<Error, string>> {
    try {
      const response = await axios.get(
        `${hostAddr}/tequilapi/connection/ip`,
        {
          headers: {
            'content-type': 'application.json',
            authorization: token,
          },
        },
      );

      return [null, response.data['ip'] || null];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }
}
