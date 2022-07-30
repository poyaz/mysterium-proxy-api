import {Injectable, Logger} from '@nestjs/common';
import {IProxyApiRepositoryInterface} from '@src-core/interface/i-proxy-api-repository.interface';
import Redis from 'ioredis';
import {RedisService} from '@liaoliaots/nestjs-redis';
import {AsyncReturn} from '@src-core/utility';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {FilterModel} from '@src-core/model/filter.model';

@Injectable()
export class MystCacheIdApiRepository implements IProxyApiRepositoryInterface {
  private readonly _redis: Redis;
  private static PREFIX_KEY: string = 'myst_provider';
  private static EXPIRE_KEY: number = 5 * 60;

  constructor(
    private readonly _redisService: RedisService,
    private readonly _mystApiRepository: IProxyApiRepositoryInterface,
    private readonly _logger: Logger,
  ) {
    this._redis = this._redisService.getClient();
  }

  async getAll<F>(filter?: F): Promise<AsyncReturn<Error, Array<VpnProviderModel>>> {
    const [vpnDataError, vpnDataList, totalCount] = await this._mystApiRepository.getAll(filter);
    if (vpnDataError) {
      return [vpnDataError];
    }

    const addCacheData = vpnDataList.map((v) => ([`${MystCacheIdApiRepository.PREFIX_KEY}:${v.id}`, v.providerIdentity])).flat();

    try {
      await this._redis.mset(addCacheData);

      const tasks = [];
      for (let i = 0; i < addCacheData.length; i = i + 2) {
        tasks.push(this._redis.expire(addCacheData[i], MystCacheIdApiRepository.EXPIRE_KEY));
      }
      Promise.all(tasks).catch((error) => {
        this._logger.error(
          `Fail to update expire key for prefix "${MystCacheIdApiRepository.PREFIX_KEY}"`,
          error.stack,
          this.constructor.name,
        );
      });

      return [null, vpnDataList, totalCount];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async getById(id: string): Promise<AsyncReturn<Error, VpnProviderModel | null>> {
    const providerIdentity = await this._getProviderIdCache(id);
    if (!providerIdentity) {
      return this._mystApiRepository.getById(id);
    }

    const filter = new FilterModel<VpnProviderModel>();
    filter.addCondition({$opr: 'eq', providerIdentity});

    const [error, dataList] = await this._mystApiRepository.getAll(filter);
    if (error) {
      return [error];
    }

    if (dataList.length === 0) {
      return [null, null];
    }

    return [null, dataList[0]];
  }

  private async _getProviderIdCache(id: string): Promise<string | null> {
    try {
      return await this._redis.get(`${MystCacheIdApiRepository.PREFIX_KEY}:${id}`);
    } catch (error) {
      this._logger.error(
        `Fail to read key for prefix "${MystCacheIdApiRepository.PREFIX_KEY}"`,
        error.stack,
        this.constructor.name,
      );

      return null;
    }
  }
}
