import {Injectable, Logger} from '@nestjs/common';
import Redis from 'ioredis';
import {RedisService} from '@liaoliaots/nestjs-redis';
import {AsyncReturn} from '@src-core/utility';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {FilterModel} from '@src-core/model/filter.model';
import {RunnerModel} from '@src-core/model/runner.model';
import {IMystApiRepositoryInterface} from '@src-core/interface/i-myst-api-repository.interface';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';

@Injectable()
export class MystProviderCacheIdApiRepository implements IMystApiRepositoryInterface {
  private readonly _redis: Redis;
  private static PREFIX_KEY: string = 'myst_provider';
  private static EXPIRE_KEY: number = 5 * 60;

  constructor(
    private readonly _redisService: RedisService,
    private readonly _mystProviderApiRepository: IMystApiRepositoryInterface,
    private readonly _logger: Logger,
  ) {
    this._redis = this._redisService.getClient();
  }

  async getAll<F>(runnerModel: RunnerModel, filter?: F): Promise<AsyncReturn<Error, Array<VpnProviderModel>>> {
    const [vpnDataError, vpnDataList, totalCount] = await this._mystProviderApiRepository.getAll(runnerModel, filter);
    if (vpnDataError) {
      return [vpnDataError];
    }

    const addCacheData = vpnDataList.map((v) => ([`${MystProviderCacheIdApiRepository.PREFIX_KEY}:${v.id}`, v.providerIdentity])).flat();

    try {
      await this._redis.mset(addCacheData);

      const tasks = [];
      for (let i = 0; i < addCacheData.length; i = i + 2) {
        tasks.push(this._redis.expire(addCacheData[i], MystProviderCacheIdApiRepository.EXPIRE_KEY));
      }
      Promise.all(tasks).catch((error) => {
        this._logger.error(
          `Fail to update expire key for prefix "${MystProviderCacheIdApiRepository.PREFIX_KEY}"`,
          error.stack,
          this.constructor.name,
        );
      });

      return [null, vpnDataList, totalCount];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async getById(runnerModel: RunnerModel, id: string): Promise<AsyncReturn<Error, VpnProviderModel | null>> {
    const providerIdentity = await this._getProviderIdCache(id);
    if (!providerIdentity) {
      return this._mystProviderApiRepository.getById(runnerModel, id);
    }

    const filter = new FilterModel<VpnProviderModel>();
    filter.addCondition({$opr: 'eq', providerIdentity});

    const [error, dataList] = await this._mystProviderApiRepository.getAll(runnerModel, filter);
    if (error) {
      return [error];
    }

    if (dataList.length === 0) {
      return [null, null];
    }

    return [null, dataList[0]];
  }

  connect(runner: RunnerModel, VpnProviderModel: VpnProviderModel): Promise<AsyncReturn<Error, VpnProviderModel>> {
    return Promise.resolve(undefined);
  }

  disconnect(runner: RunnerModel, force?: boolean): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  registerIdentity(runner: RunnerModel, userIdentity: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  unlockIdentity(runner: RunnerModel, identity: MystIdentityModel): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  private async _getProviderIdCache(id: string): Promise<string | null> {
    try {
      return await this._redis.get(`${MystProviderCacheIdApiRepository.PREFIX_KEY}:${id}`);
    } catch (error) {
      this._logger.error(
        `Fail to read key for prefix "${MystProviderCacheIdApiRepository.PREFIX_KEY}"`,
        error.stack,
        this.constructor.name,
      );

      return null;
    }
  }
}
