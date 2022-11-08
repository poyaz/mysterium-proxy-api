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
import {IsDefined, IsIP, IsString, validate} from 'class-validator';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import {plainToInstance} from 'class-transformer';
import {UnknownException} from '@src-core/exception/unknown.exception';

class ProviderConnectionInfoDto {
  @IsDefined()
  @IsString()
  @IsIP('4')
  ip: string;

  @IsDefined()
  @IsString()
  provider_identity: string;
}

interface ProviderConnectionInfo {
  ip: string;
  providerIdentity: string;
}

@Injectable()
export class MystProviderCacheApiRepository implements IMystApiRepositoryInterface {
  private readonly _redis: Redis;
  private static PREFIX_KEY_TMP_ID: string = 'myst_provider:tmp:id';
  private static PREFIX_KEY_INFO: string = 'myst_provider:info';
  private static EXPIRE_KEY: number = 5 * 60;

  constructor(
    private readonly _redisService: RedisService,
    private readonly _mystProviderApiRepository: IMystApiRepositoryInterface,
    private readonly _logger: Logger,
  ) {
    this._redis = this._redisService.getClient();
  }

  async getAll<F>(runnerModel: RunnerModel, filter?: F): Promise<AsyncReturn<Error, Array<VpnProviderModel>>> {
    const [
      [vpnDataError, vpnDataList, totalCount],
      [connectionInfoError, connectionInfoObj],
    ] = await Promise.all([
      this._mystProviderApiRepository.getAll(runnerModel, filter),
      this._getProviderConnectionInfo(),
    ]);
    if (vpnDataError) {
      return [vpnDataError];
    }
    if (connectionInfoError) {
      return [connectionInfoError];
    }
    if (totalCount === 0) {
      return [null, [], 0];
    }

    const addCacheData = [];
    for (const vpnData of vpnDataList) {
      if (connectionInfoObj[vpnData.id]?.ip) {
        vpnData.ip = connectionInfoObj[vpnData.id].ip;
        vpnData.mask = 32;
      }

      addCacheData.push(`${MystProviderCacheApiRepository.PREFIX_KEY_TMP_ID}:${vpnData.id}`, vpnData.providerIdentity);
    }

    try {
      await this._redis.mset(addCacheData);

      const tasks = [];
      for (let i = 0; i < addCacheData.length; i = i + 2) {
        tasks.push(this._redis.expire(addCacheData[i], MystProviderCacheApiRepository.EXPIRE_KEY));
      }
      Promise.all(tasks).catch((error) => {
        this._logger.error(
          `Fail to update expire key for prefix "${MystProviderCacheApiRepository.PREFIX_KEY_TMP_ID}"`,
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

    const vpnData = dataList[0];
    const [connectionInfoError, connectionInfoObj] = await this._getProviderConnectionInfo(vpnData.id);
    if (connectionInfoError) {
      return [connectionInfoError];
    }

    if (connectionInfoObj[vpnData.id]?.ip) {
      vpnData.ip = connectionInfoObj[vpnData.id].ip;
      vpnData.mask = 32;
    }

    return [null, vpnData];
  }

  async connect(runner: RunnerModel, vpnProviderModel: VpnProviderModel): Promise<AsyncReturn<Error, VpnProviderModel>> {
    return this._mystProviderApiRepository.connect(runner, vpnProviderModel);
  }

  async disconnect(runner: RunnerModel, force?: boolean): Promise<AsyncReturn<Error, null>> {
    return this._mystProviderApiRepository.disconnect(runner, force);
  }

  async registerIdentity(runner: RunnerModel, userIdentity: string): Promise<AsyncReturn<Error, null>> {
    return this._mystProviderApiRepository.registerIdentity(runner, userIdentity);
  }

  async unlockIdentity(runner: RunnerModel, identity: MystIdentityModel): Promise<AsyncReturn<Error, null>> {
    return this._mystProviderApiRepository.unlockIdentity(runner, identity);
  }

  private async _getProviderConnectionInfo(providerId?: string): Promise<AsyncReturn<Error, Record<string, ProviderConnectionInfo>>> {
    const [error, data] = await this._getProviderConnectionInfoFromRedis(providerId);
    if (error) {
      return [error];
    }

    try {
      const result = await MystProviderCacheApiRepository._fillProviderConnectionInfo(data);

      return [null, result];
    } catch (error) {
      if (error instanceof SyntaxError) {
        return [new FillDataRepositoryException([])];
      }
      if (error instanceof FillDataRepositoryException) {
        return [error];
      }

      return [new UnknownException(error)];
    }
  }

  private async _getProviderConnectionInfoFromRedis(providerId?: string): Promise<AsyncReturn<Error, Record<string, string>>> {
    try {
      if (!providerId) {
        const dataObj = await this._redis.hgetall(`${MystProviderCacheApiRepository.PREFIX_KEY_INFO}:all`);

        return [null, dataObj];
      }

      const dataList = await this._redis.hmget(`${MystProviderCacheApiRepository.PREFIX_KEY_INFO}:all`, providerId);
      if (dataList.length === 0) {
        return [null, {}];
      }
      if (!dataList[0]) {
        return [null, {}];
      }

      const dataObj = {[providerId]: dataList[0]};

      return [null, dataObj];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  private static async _fillProviderConnectionInfo(data: Record<string, string>): Promise<Record<string, ProviderConnectionInfo>> {
    const result: Record<string, ProviderConnectionInfo> = {};

    for await (const [key, value] of Object.entries(data)) {
      const dataObj = JSON.parse(<string>value);
      const dataInstance = plainToInstance(ProviderConnectionInfoDto, dataObj);
      const errorsList = await validate(dataInstance);
      if (errorsList.length === 0) {
        result[key] = {
          ip: dataInstance.ip,
          providerIdentity: dataInstance.provider_identity,
        };
        continue;
      }

      const propertiesError: Array<keyof VpnProviderModel> = [];
      for (const error of errorsList) {
        if (error.property === <keyof ProviderConnectionInfoDto>'ip') {
          propertiesError.push('ip');
        }
      }

      throw new FillDataRepositoryException(propertiesError);
    }

    return result;
  }

  private async _getProviderIdCache(id: string): Promise<string | null> {
    try {
      const [providerIdentity, [providerIdentityError, providerIdentityData]] = await Promise.all([
        this._redis.get(`${MystProviderCacheApiRepository.PREFIX_KEY_TMP_ID}:${id}`),
        this._getProviderConnectionInfo(id),
      ]);

      if (providerIdentity) {
        return providerIdentity;
      }

      if (providerIdentityError) {
        return null;
      }
      if (providerIdentityData[id]) {
        return providerIdentityData[id].providerIdentity;
      }

      return null;
    } catch (error) {
      this._logger.error(
        `Fail to read key for prefix "${MystProviderCacheApiRepository.PREFIX_KEY_TMP_ID}"`,
        error.stack,
        this.constructor.name,
      );

      return null;
    }
  }
}
