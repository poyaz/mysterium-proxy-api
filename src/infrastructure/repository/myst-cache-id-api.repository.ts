import {Injectable} from '@nestjs/common';
import {IProxyApiRepositoryInterface} from '@src-core/interface/i-proxy-api-repository.interface';
import Redis from 'ioredis';
import {RedisService} from '@liaoliaots/nestjs-redis';
import {AsyncReturn} from '@src-core/utility';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {RepositoryException} from '@src-core/exception/repository.exception';

@Injectable()
export class MystCacheIdApiRepository implements IProxyApiRepositoryInterface {
  private readonly _redis: Redis;
  private static PREFIX_KEY: string = 'myst_provider';
  private static EXPIRE_KEY: number = 5 * 60;

  constructor(
    private readonly _redisService: RedisService,
    private readonly _mystApiRepository: IProxyApiRepositoryInterface,
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
      Promise.all(tasks).catch(() => ({}));

      return [null, vpnDataList, totalCount];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  getById(id: string): Promise<AsyncReturn<Error, VpnProviderModel | null>> {
    return Promise.resolve(undefined);
  }
}
