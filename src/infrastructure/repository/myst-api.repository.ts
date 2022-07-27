import {Injectable} from '@nestjs/common';
import {IProxyApiRepositoryInterface} from '@src-core/interface/i-proxy-api-repository.interface';
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
import {RedisService} from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

@Injectable()
export class MystApiRepository implements IProxyApiRepositoryInterface {
  private readonly _redis: Redis;
  private readonly _myst_api_prefix;
  private static PREFIX_KEY = 'myst_provider';

  constructor(
    private readonly _redisService: RedisService,
    private readonly _identifier: IIdentifier,
    myst_api_address) {
    this._redis = this._redisService.getClient();
    this._myst_api_prefix = `${myst_api_address.replace(/^(.+)\/+$/g, '$1')}/api/v3/`;
  }

  async getAll<F>(filter?: F): Promise<AsyncReturn<Error, Array<VpnProviderModel>>> {
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

  async getById(id: string): Promise<AsyncReturn<Error, VpnProviderModel | null>> {
    let data;

    try {
      const cacheProviderId = await this._redis.get(`${MystApiRepository.PREFIX_KEY}_${id}`);
      if (!cacheProviderId) {
        data = await this._getByIdAllData(id);
      }

      return [null, data];
    } catch (error) {
      if (error instanceof FillDataRepositoryException) {
        return [error];
      }

      return [new RepositoryException(error)];
    }
  }

  private async _getByIdAllData(id) {
    const response = await axios.get(`${this._myst_api_prefix}/proposals`, {
      headers: {
        'content-type': 'application.json',
      },
      params: {
        service_type: VpnServiceTypeEnum.WIREGUARD,
      },
    });
    if (!response.data) {
      return null;
    }

    const result = response.data.filter((v) => this._identifier.generateId(v['provider_id']) === id);

    return result.length === 1 ? result[0] : null;
  }

  private async _getByIdWithProviderId(providerId: string) {
  }

  private _fillModel(row) {
    return new VpnProviderModel({
      id: this._identifier.generateId(row['provider_id']),
      serviceType: VpnServiceTypeEnum.WIREGUARD,
      providerName: VpnProviderName.MYSTERIUM,
      providerIdentity: row['provider_id'],
      providerIpType: MystApiRepository._convertServiceType(row['location']['ip_type']),
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
}
