import {Test, TestingModule} from '@nestjs/testing';
import {MystProviderCacheApiRepository} from './myst-provider-cache-api.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {Redis} from 'ioredis';
import {RedisService} from '@liaoliaots/nestjs-redis';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName, VpnProviderStatusEnum,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {Logger} from '@nestjs/common';
import {FilterModel} from '@src-core/model/filter.model';
import {IMystApiRepositoryInterface} from '@src-core/interface/i-myst-api-repository.interface';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';

describe('MystProviderCacheApiRepository', () => {
  let repository: MystProviderCacheApiRepository;
  let redis: MockProxy<Redis>;
  let redisService: MockProxy<RedisService>;
  let mystProviderApiRepository: MockProxy<IMystApiRepositoryInterface>;
  let logger: MockProxy<Logger>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    redis = mock<Redis>();
    redisService = mock<RedisService>();
    redisService.getClient.mockReturnValue(redis);
    mystProviderApiRepository = mock<IMystApiRepositoryInterface>();
    logger = mock<Logger>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RedisService,
          useValue: redisService,
        },
        {
          provide: ProviderTokenEnum.MYST_PROVIDER_CACHE_API_REPOSITORY,
          useValue: mystProviderApiRepository,
        },
        {
          provide: Logger,
          useValue: logger,
        },
        {
          provide: MystProviderCacheApiRepository,
          inject: [RedisService, ProviderTokenEnum.MYST_PROVIDER_CACHE_API_REPOSITORY, Logger],
          useFactory: (redisService: RedisService, mystProviderApiRepository: IMystApiRepositoryInterface, logger: Logger) =>
            new MystProviderCacheApiRepository(redisService, mystProviderApiRepository, logger),
        },
      ],
    }).compile();

    repository = module.get<MystProviderCacheApiRepository>(MystProviderCacheApiRepository);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe(`Get all vpn provider info`, () => {
    let inputRunnerModel: RunnerModel;
    let outputVpnProviderData1: VpnProviderModel;
    let outputVpnProviderData2: VpnProviderModel;
    let outputRedisGetAll: Record<string, string>;
    let outputRedisGetAllInvalidJson: Record<string, string>;
    let outputRedisGetAllInvalidData: Record<string, string>;

    beforeEach(() => {
      inputRunnerModel = defaultModelFactory<RunnerModel>(
        RunnerModel,
        {
          id: 'default-id',
          serial: 'default-serial',
          name: 'default-name',
          service: RunnerServiceEnum.MYST,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.HTTP,
          status: RunnerStatusEnum.RUNNING,
          insertDate: new Date(),
        },
        ['id', 'serial', 'name', 'service', 'exec', 'socketType', 'status', 'insertDate'],
      );

      outputVpnProviderData1 = new VpnProviderModel({
        id: '11111111-1111-1111-1111-111111111111',
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerIpType: VpnProviderIpTypeEnum.HOSTING,
        country: 'GB',
        isRegister: false,
        insertDate: new Date(),
      });

      outputVpnProviderData2 = new VpnProviderModel({
        id: '22222222-2222-2222-2222-222222222222',
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity2',
        providerIpType: VpnProviderIpTypeEnum.HOSTING,
        country: 'GB',
        isRegister: false,
        insertDate: new Date(),
      });

      outputRedisGetAll = {
        [outputVpnProviderData1.providerIdentity]: JSON.stringify(
          {
            ip: '127.0.0.1',
          },
        ),
      };
      outputRedisGetAllInvalidJson = {
        [outputVpnProviderData1.providerIdentity]: 'invalid-json',
      };
      outputRedisGetAllInvalidData = {
        [outputVpnProviderData1.providerIdentity]: JSON.stringify(
          {
            ip: 'invalid-ip',
          },
        ),
      };
    });

    it(`Should error get all vpn provider when get data`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([new UnknownException()]);
      redis.hgetall.mockResolvedValue(outputRedisGetAll);

      const [error] = await repository.getAll(inputRunnerModel);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(redis.hgetall).toHaveBeenCalled();
      expect(redis.hgetall).toHaveBeenCalledWith('myst_provider:info:all');
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all vpn provider when fail to get connection info from redis`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([null, [], 0]);
      const executeError = new Error('Error in execute set on database');
      redis.hgetall.mockRejectedValue(executeError);

      const [error] = await repository.getAll(inputRunnerModel);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(redis.hgetall).toHaveBeenCalled();
      expect(redis.hgetall).toHaveBeenCalledWith('myst_provider:info:all');
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error get all vpn provider when fail to parse invalid json`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([null, [], 0]);
      redis.hgetall.mockResolvedValue(outputRedisGetAllInvalidJson);

      const [error] = await repository.getAll(inputRunnerModel);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(redis.hgetall).toHaveBeenCalled();
      expect(redis.hgetall).toHaveBeenCalledWith('myst_provider:info:all');
      expect(error).toBeInstanceOf(FillDataRepositoryException);
    });

    it(`Should error get all vpn provider when fail to validate keys`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([null, [], 0]);
      redis.hgetall.mockResolvedValue(outputRedisGetAllInvalidData);

      const [error] = await repository.getAll(inputRunnerModel);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(redis.hgetall).toHaveBeenCalled();
      expect(redis.hgetall).toHaveBeenCalledWith('myst_provider:info:all');
      expect(error).toBeInstanceOf(FillDataRepositoryException);
      expect((<FillDataRepositoryException<VpnProviderModel>>error).fillProperties).toEqual(expect.arrayContaining<keyof VpnProviderModel>(['ip']));
    });

    it(`Should successfully get all vpn provider and return empty records`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([null, [], 0]);
      redis.hgetall.mockResolvedValue(outputRedisGetAll);

      const [error, result, total] = await repository.getAll(inputRunnerModel);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(redis.hgetall).toHaveBeenCalled();
      expect(redis.hgetall).toHaveBeenCalledWith('myst_provider:info:all');
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });

    it(`Should error get all vpn provider when append to redis`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([
        null,
        [outputVpnProviderData1, outputVpnProviderData2],
        2,
      ]);
      redis.hgetall.mockResolvedValue(outputRedisGetAll);
      const executeError = new Error('Error in execute set on database');
      redis.mset.mockRejectedValue(executeError);

      const [error] = await repository.getAll(inputRunnerModel);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(redis.hgetall).toHaveBeenCalled();
      expect(redis.hgetall).toHaveBeenCalledWith('myst_provider:info:all');
      expect(redis.mset).toHaveBeenCalled();
      expect(redis.mset).toBeCalledWith(expect.arrayContaining([
        `myst_provider:tmp:id:${outputVpnProviderData1.id}`,
        outputVpnProviderData1.providerIdentity,
        `myst_provider:tmp:id:${outputVpnProviderData2.id}`,
        outputVpnProviderData2.providerIdentity,
      ]));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully get all vpn provider (Async expire key has executed successfully)`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([
        null,
        [outputVpnProviderData1, outputVpnProviderData2],
        2,
      ]);
      redis.hgetall.mockResolvedValue(outputRedisGetAll);
      redis.mset.mockResolvedValue(null);
      redis.expire.mockResolvedValue(null);

      const [error, result, totalCount] = await repository.getAll(inputRunnerModel);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(redis.hgetall).toHaveBeenCalled();
      expect(redis.hgetall).toHaveBeenCalledWith('myst_provider:info:all');
      expect(redis.mset).toHaveBeenCalled();
      expect(redis.mset).toBeCalledWith(expect.arrayContaining([
        `myst_provider:tmp:id:${outputVpnProviderData1.id}`,
        outputVpnProviderData1.providerIdentity,
        `myst_provider:tmp:id:${outputVpnProviderData2.id}`,
        outputVpnProviderData2.providerIdentity,
      ]));
      expect(redis.expire).toHaveBeenCalledTimes(2);
      expect(redis.expire.mock.calls[0]).toEqual(expect.arrayContaining([`myst_provider:tmp:id:${outputVpnProviderData1.id}`, 5 * 60]));
      expect(redis.expire.mock.calls[1]).toEqual(expect.arrayContaining([`myst_provider:tmp:id:${outputVpnProviderData2.id}`, 5 * 60]));
      expect(logger.error).toHaveBeenCalledTimes(0);
      expect(error).toBeNull();
      expect(result.length).toEqual(2);
      expect(result[0]).toEqual(<VpnProviderModel>{
        id: outputVpnProviderData1.id,
        serviceType: outputVpnProviderData1.serviceType,
        providerName: outputVpnProviderData1.providerName,
        providerIdentity: outputVpnProviderData1.providerIdentity,
        providerIpType: outputVpnProviderData1.providerIpType,
        country: outputVpnProviderData1.country,
        ip: '127.0.0.1',
        isRegister: outputVpnProviderData1.isRegister,
        insertDate: outputVpnProviderData1.insertDate,
      });
      expect(result[1]).toEqual(<VpnProviderModel>{
        id: outputVpnProviderData2.id,
        serviceType: outputVpnProviderData2.serviceType,
        providerName: outputVpnProviderData2.providerName,
        providerIdentity: outputVpnProviderData2.providerIdentity,
        providerIpType: outputVpnProviderData2.providerIpType,
        country: outputVpnProviderData2.country,
        isRegister: outputVpnProviderData2.isRegister,
        insertDate: outputVpnProviderData2.insertDate,
      });
      expect(totalCount).toEqual(2);
    });

    it(`Should successfully get all vpn provider (Async expire key has executed failure)`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([
        null,
        [outputVpnProviderData1, outputVpnProviderData2],
        2,
      ]);
      redis.hgetall.mockResolvedValue(outputRedisGetAll);
      redis.mset.mockResolvedValue(null);
      redis.expire
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('Error in execute expire on database'));
      logger.error.mockReturnValue(null);

      const [error, result, totalCount] = await repository.getAll(inputRunnerModel);

      jest.useRealTimers();
      await new Promise(setImmediate);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(redis.hgetall).toHaveBeenCalled();
      expect(redis.hgetall).toHaveBeenCalledWith('myst_provider:info:all');
      expect(redis.mset).toHaveBeenCalled();
      expect(redis.mset).toBeCalledWith(expect.arrayContaining([
        `myst_provider:tmp:id:${outputVpnProviderData1.id}`,
        outputVpnProviderData1.providerIdentity,
        `myst_provider:tmp:id:${outputVpnProviderData2.id}`,
        outputVpnProviderData2.providerIdentity,
      ]));
      expect(redis.expire).toHaveBeenCalledTimes(2);
      expect(redis.expire.mock.calls[0]).toEqual(expect.arrayContaining([`myst_provider:tmp:id:${outputVpnProviderData1.id}`, 5 * 60]));
      expect(redis.expire.mock.calls[1]).toEqual(expect.arrayContaining([`myst_provider:tmp:id:${outputVpnProviderData2.id}`, 5 * 60]));
      expect(logger.error).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result.length).toEqual(2);
      expect(result[0]).toEqual(<VpnProviderModel>{
        id: outputVpnProviderData1.id,
        serviceType: outputVpnProviderData1.serviceType,
        providerName: outputVpnProviderData1.providerName,
        providerIdentity: outputVpnProviderData1.providerIdentity,
        providerIpType: outputVpnProviderData1.providerIpType,
        country: outputVpnProviderData1.country,
        ip: '127.0.0.1',
        isRegister: outputVpnProviderData1.isRegister,
        insertDate: outputVpnProviderData1.insertDate,
      });
      expect(result[1]).toEqual(<VpnProviderModel>{
        id: outputVpnProviderData2.id,
        serviceType: outputVpnProviderData2.serviceType,
        providerName: outputVpnProviderData2.providerName,
        providerIdentity: outputVpnProviderData2.providerIdentity,
        providerIpType: outputVpnProviderData2.providerIpType,
        country: outputVpnProviderData2.country,
        isRegister: outputVpnProviderData2.isRegister,
        insertDate: outputVpnProviderData2.insertDate,
      });
      expect(totalCount).toEqual(2);
    });

    it(`Should successfully get all vpn provider (With empty connection info data)`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([
        null,
        [outputVpnProviderData1, outputVpnProviderData2],
        2,
      ]);
      redis.hgetall.mockResolvedValue({});
      redis.mset.mockResolvedValue(null);
      redis.expire.mockResolvedValue(null);

      const [error, result, totalCount] = await repository.getAll(inputRunnerModel);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(redis.hgetall).toHaveBeenCalled();
      expect(redis.hgetall).toHaveBeenCalledWith('myst_provider:info:all');
      expect(redis.mset).toHaveBeenCalled();
      expect(redis.mset).toBeCalledWith(expect.arrayContaining([
        `myst_provider:tmp:id:${outputVpnProviderData1.id}`,
        outputVpnProviderData1.providerIdentity,
        `myst_provider:tmp:id:${outputVpnProviderData2.id}`,
        outputVpnProviderData2.providerIdentity,
      ]));
      expect(redis.expire).toHaveBeenCalledTimes(2);
      expect(redis.expire.mock.calls[0]).toEqual(expect.arrayContaining([`myst_provider:tmp:id:${outputVpnProviderData1.id}`, 5 * 60]));
      expect(redis.expire.mock.calls[1]).toEqual(expect.arrayContaining([`myst_provider:tmp:id:${outputVpnProviderData2.id}`, 5 * 60]));
      expect(logger.error).toHaveBeenCalledTimes(0);
      expect(error).toBeNull();
      expect(result.length).toEqual(2);
      expect(result[0]).toEqual(<VpnProviderModel>{
        id: outputVpnProviderData1.id,
        serviceType: outputVpnProviderData1.serviceType,
        providerName: outputVpnProviderData1.providerName,
        providerIdentity: outputVpnProviderData1.providerIdentity,
        providerIpType: outputVpnProviderData1.providerIpType,
        country: outputVpnProviderData1.country,
        isRegister: outputVpnProviderData1.isRegister,
        insertDate: outputVpnProviderData1.insertDate,
      });
      expect(result[1]).toEqual(<VpnProviderModel>{
        id: outputVpnProviderData2.id,
        serviceType: outputVpnProviderData2.serviceType,
        providerName: outputVpnProviderData2.providerName,
        providerIdentity: outputVpnProviderData2.providerIdentity,
        providerIpType: outputVpnProviderData2.providerIpType,
        country: outputVpnProviderData2.country,
        isRegister: outputVpnProviderData2.isRegister,
        insertDate: outputVpnProviderData2.insertDate,
      });
      expect(totalCount).toEqual(2);
    });
  });

  describe(`Get vpn info by id`, () => {
    let inputRunnerModel: RunnerModel;
    let inputId;
    let outputVpnProviderData: VpnProviderModel;
    let matchFilterProviderIdentity: FilterModel<VpnProviderModel>;
    let outputRedisGetOne: Array<string>;
    let outputRedisGetOneEmpty: Array<string>;
    let outputRedisGetOneNull: Array<string>;
    let outputRedisGetOneInvalidJson: Array<string>;
    let outputRedisGetOneInvalidData: Array<string>;

    beforeEach(() => {
      inputRunnerModel = defaultModelFactory<RunnerModel>(
        RunnerModel,
        {
          id: 'default-id',
          serial: 'default-serial',
          name: 'default-name',
          service: RunnerServiceEnum.MYST,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.HTTP,
          status: RunnerStatusEnum.RUNNING,
          insertDate: new Date(),
        },
        ['id', 'serial', 'name', 'service', 'exec', 'socketType', 'status', 'insertDate'],
      );
      inputId = identifierMock.generateId();

      outputVpnProviderData = new VpnProviderModel({
        id: '11111111-1111-1111-1111-111111111111',
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerIpType: VpnProviderIpTypeEnum.HOSTING,
        country: 'GB',
        isRegister: false,
        insertDate: new Date(),
      });

      matchFilterProviderIdentity = new FilterModel<VpnProviderModel>();
      matchFilterProviderIdentity.addCondition({$opr: 'eq', providerIdentity: outputVpnProviderData.providerIdentity});

      outputRedisGetOne = [
        JSON.stringify(
          {
            ip: '127.0.0.1',
          },
        ),
      ];
      outputRedisGetOneEmpty = [];
      outputRedisGetOneNull = [null];
      outputRedisGetOneInvalidJson = ['invalid-json'];
      outputRedisGetOneInvalidData = [
        JSON.stringify(
          {
            ip: 'invalid-ip',
          },
        ),
      ];
    });

    it(`Should error get vpn info by id when fetch data from getById (Fail read data from redis)`, async () => {
      const executeError = new Error('Error in execute get on database');
      redis.get.mockRejectedValue(executeError);
      logger.error.mockReturnValue(null);
      mystProviderApiRepository.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getById(inputRunnerModel, inputId);

      expect(redis.get).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
      expect(mystProviderApiRepository.getById).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get vpn info by id when fetch data from getById (Return null from redis)`, async () => {
      redis.get.mockResolvedValue(null);
      logger.error.mockReturnValue(null);
      mystProviderApiRepository.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getById(inputRunnerModel, inputId);

      expect(redis.get).toHaveBeenCalled();
      expect(logger.error).toBeCalledTimes(0);
      expect(mystProviderApiRepository.getById).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get vpn info by id when fetch data from getById (Return null from redis)`, async () => {
      redis.get.mockResolvedValue(null);
      logger.error.mockReturnValue(null);
      mystProviderApiRepository.getById.mockResolvedValue([null, outputVpnProviderData]);

      const [error, result] = await repository.getById(inputRunnerModel, inputId);

      expect(redis.get).toHaveBeenCalled();
      expect(logger.error).toBeCalledTimes(0);
      expect(mystProviderApiRepository.getById).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toEqual(<VpnProviderModel>{
        id: outputVpnProviderData.id,
        serviceType: outputVpnProviderData.serviceType,
        providerName: outputVpnProviderData.providerName,
        providerIdentity: outputVpnProviderData.providerIdentity,
        providerIpType: outputVpnProviderData.providerIpType,
        country: outputVpnProviderData.country,
        isRegister: outputVpnProviderData.isRegister,
        insertDate: outputVpnProviderData.insertDate,
      });
    });

    it(`Should error get vpn info by id when fetch data from getAll with filter (Return data from redis)`, async () => {
      redis.get.mockResolvedValue(outputVpnProviderData.providerIdentity);
      mystProviderApiRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getById(inputRunnerModel, inputId);

      expect(redis.get).toHaveBeenCalled();
      expect(logger.error).toBeCalledTimes(0);
      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<VpnProviderModel>>mystProviderApiRepository.getAll.mock.calls[0][1]).getCondition('providerIdentity')).toMatchObject({
        $opr: 'eq',
        providerIdentity: outputVpnProviderData.providerIdentity,
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get vpn info by id when fetch data from getAll with filter and return null when not found (Return data from redis)`, async () => {
      redis.get.mockResolvedValue(outputVpnProviderData.providerIdentity);
      mystProviderApiRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result] = await repository.getById(inputRunnerModel, inputId);

      expect(redis.get).toHaveBeenCalled();
      expect(logger.error).toBeCalledTimes(0);
      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<VpnProviderModel>>mystProviderApiRepository.getAll.mock.calls[0][1]).getCondition('providerIdentity')).toMatchObject({
        $opr: 'eq',
        providerIdentity: outputVpnProviderData.providerIdentity,
      });
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should successfully get vpn info by id when fetch data from getAll with filter (Return data from redis)`, async () => {
      redis.get.mockResolvedValue(outputVpnProviderData.providerIdentity);
      mystProviderApiRepository.getAll.mockResolvedValue([null, [outputVpnProviderData], 1]);
      redis.hmget.mockResolvedValue(outputRedisGetOneEmpty);

      const [error, result] = await repository.getById(inputRunnerModel, inputId);

      expect(redis.get).toHaveBeenCalled();
      expect(logger.error).toBeCalledTimes(0);
      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<VpnProviderModel>>mystProviderApiRepository.getAll.mock.calls[0][1]).getCondition('providerIdentity')).toMatchObject({
        $opr: 'eq',
        providerIdentity: outputVpnProviderData.providerIdentity,
      });
      expect(redis.hmget).toHaveBeenCalled();
      expect(redis.hmget).toHaveBeenCalledWith('myst_provider:info:all', outputVpnProviderData.providerIdentity);
      expect(error).toBeNull();
      expect(result).toEqual(<VpnProviderModel>{
        id: outputVpnProviderData.id,
        serviceType: outputVpnProviderData.serviceType,
        providerName: outputVpnProviderData.providerName,
        providerIdentity: outputVpnProviderData.providerIdentity,
        providerIpType: outputVpnProviderData.providerIpType,
        country: outputVpnProviderData.country,
        isRegister: outputVpnProviderData.isRegister,
        insertDate: outputVpnProviderData.insertDate,
      });
    });

    it(`Should error get vpn info by id when fail to get connection info from redis`, async () => {
      redis.get.mockResolvedValue(outputVpnProviderData.providerIdentity);
      mystProviderApiRepository.getAll.mockResolvedValue([null, [outputVpnProviderData], 1]);
      const executeError = new Error('Error in execute set on database');
      redis.hmget.mockRejectedValue(executeError);

      const [error] = await repository.getById(inputRunnerModel, inputId);

      expect(redis.get).toHaveBeenCalled();
      expect(logger.error).toBeCalledTimes(0);
      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<VpnProviderModel>>mystProviderApiRepository.getAll.mock.calls[0][1]).getCondition('providerIdentity')).toMatchObject({
        $opr: 'eq',
        providerIdentity: outputVpnProviderData.providerIdentity,
      });
      expect(redis.hmget).toHaveBeenCalled();
      expect(redis.hmget).toHaveBeenCalledWith('myst_provider:info:all', outputVpnProviderData.providerIdentity);
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error get vpn info by id when fail to parse invalid json`, async () => {
      redis.get.mockResolvedValue(outputVpnProviderData.providerIdentity);
      mystProviderApiRepository.getAll.mockResolvedValue([null, [outputVpnProviderData], 1]);
      redis.hmget.mockResolvedValue(outputRedisGetOneInvalidJson);

      const [error] = await repository.getById(inputRunnerModel, inputId);

      expect(redis.get).toHaveBeenCalled();
      expect(logger.error).toBeCalledTimes(0);
      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<VpnProviderModel>>mystProviderApiRepository.getAll.mock.calls[0][1]).getCondition('providerIdentity')).toMatchObject({
        $opr: 'eq',
        providerIdentity: outputVpnProviderData.providerIdentity,
      });
      expect(redis.hmget).toHaveBeenCalled();
      expect(redis.hmget).toHaveBeenCalledWith('myst_provider:info:all', outputVpnProviderData.providerIdentity);
      expect(error).toBeInstanceOf(FillDataRepositoryException);
    });

    it(`Should error get vpn info by id when fail to validate key`, async () => {
      redis.get.mockResolvedValue(outputVpnProviderData.providerIdentity);
      mystProviderApiRepository.getAll.mockResolvedValue([null, [outputVpnProviderData], 1]);
      redis.hmget.mockResolvedValue(outputRedisGetOneInvalidData);

      const [error] = await repository.getById(inputRunnerModel, inputId);

      expect(redis.get).toHaveBeenCalled();
      expect(logger.error).toBeCalledTimes(0);
      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<VpnProviderModel>>mystProviderApiRepository.getAll.mock.calls[0][1]).getCondition('providerIdentity')).toMatchObject({
        $opr: 'eq',
        providerIdentity: outputVpnProviderData.providerIdentity,
      });
      expect(redis.hmget).toHaveBeenCalled();
      expect(redis.hmget).toHaveBeenCalledWith('myst_provider:info:all', outputVpnProviderData.providerIdentity);
      expect(error).toBeInstanceOf(FillDataRepositoryException);
      expect((<FillDataRepositoryException<VpnProviderModel>>error).fillProperties).toEqual(expect.arrayContaining<keyof VpnProviderModel>(['ip']));
    });

    it(`Should successfully get vpn info by id and return no ip when get connection info is empty`, async () => {
      redis.get.mockResolvedValue(outputVpnProviderData.providerIdentity);
      mystProviderApiRepository.getAll.mockResolvedValue([null, [outputVpnProviderData], 1]);
      redis.hmget.mockResolvedValue(outputRedisGetOneEmpty);

      const [error, result] = await repository.getById(inputRunnerModel, inputId);

      expect(redis.get).toHaveBeenCalled();
      expect(logger.error).toBeCalledTimes(0);
      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<VpnProviderModel>>mystProviderApiRepository.getAll.mock.calls[0][1]).getCondition('providerIdentity')).toMatchObject({
        $opr: 'eq',
        providerIdentity: outputVpnProviderData.providerIdentity,
      });
      expect(redis.hmget).toHaveBeenCalled();
      expect(redis.hmget).toHaveBeenCalledWith('myst_provider:info:all', outputVpnProviderData.providerIdentity);
      expect(error).toBeNull();
      expect(result).toEqual(<VpnProviderModel>{
        id: outputVpnProviderData.id,
        serviceType: outputVpnProviderData.serviceType,
        providerName: outputVpnProviderData.providerName,
        providerIdentity: outputVpnProviderData.providerIdentity,
        providerIpType: outputVpnProviderData.providerIpType,
        country: outputVpnProviderData.country,
        isRegister: outputVpnProviderData.isRegister,
        insertDate: outputVpnProviderData.insertDate,
      });
    });

    it(`Should successfully get vpn info by id and return no ip when get connection info is records with null`, async () => {
      redis.get.mockResolvedValue(outputVpnProviderData.providerIdentity);
      mystProviderApiRepository.getAll.mockResolvedValue([null, [outputVpnProviderData], 1]);
      redis.hmget.mockResolvedValue(outputRedisGetOneNull);

      const [error, result] = await repository.getById(inputRunnerModel, inputId);

      expect(redis.get).toHaveBeenCalled();
      expect(logger.error).toBeCalledTimes(0);
      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<VpnProviderModel>>mystProviderApiRepository.getAll.mock.calls[0][1]).getCondition('providerIdentity')).toMatchObject({
        $opr: 'eq',
        providerIdentity: outputVpnProviderData.providerIdentity,
      });
      expect(redis.hmget).toHaveBeenCalled();
      expect(redis.hmget).toHaveBeenCalledWith('myst_provider:info:all', outputVpnProviderData.providerIdentity);
      expect(error).toBeNull();
      expect(result).toEqual(<VpnProviderModel>{
        id: outputVpnProviderData.id,
        serviceType: outputVpnProviderData.serviceType,
        providerName: outputVpnProviderData.providerName,
        providerIdentity: outputVpnProviderData.providerIdentity,
        providerIpType: outputVpnProviderData.providerIpType,
        country: outputVpnProviderData.country,
        isRegister: outputVpnProviderData.isRegister,
        insertDate: outputVpnProviderData.insertDate,
      });
    });

    it(`Should successfully get vpn info by id and return with ip`, async () => {
      redis.get.mockResolvedValue(outputVpnProviderData.providerIdentity);
      mystProviderApiRepository.getAll.mockResolvedValue([null, [outputVpnProviderData], 1]);
      redis.hmget.mockResolvedValue(outputRedisGetOne);

      const [error, result] = await repository.getById(inputRunnerModel, inputId);

      expect(redis.get).toHaveBeenCalled();
      expect(logger.error).toBeCalledTimes(0);
      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<VpnProviderModel>>mystProviderApiRepository.getAll.mock.calls[0][1]).getCondition('providerIdentity')).toMatchObject({
        $opr: 'eq',
        providerIdentity: outputVpnProviderData.providerIdentity,
      });
      expect(redis.hmget).toHaveBeenCalled();
      expect(redis.hmget).toHaveBeenCalledWith('myst_provider:info:all', outputVpnProviderData.providerIdentity);
      expect(error).toBeNull();
      expect(result).toEqual(<VpnProviderModel>{
        id: outputVpnProviderData.id,
        serviceType: outputVpnProviderData.serviceType,
        providerName: outputVpnProviderData.providerName,
        providerIdentity: outputVpnProviderData.providerIdentity,
        providerIpType: outputVpnProviderData.providerIpType,
        country: outputVpnProviderData.country,
        ip: '127.0.0.1',
        isRegister: outputVpnProviderData.isRegister,
        insertDate: outputVpnProviderData.insertDate,
      });
    });
  });

  describe(`Connect to vpn`, () => {
    let inputRunner: RunnerModel<MystIdentityModel>;
    let inputVpnProvider: VpnProviderModel;
    let outputVpnProviderConnectData: VpnProviderModel;

    beforeEach(() => {
      inputRunner = new RunnerModel<MystIdentityModel>({
        id: identifierMock.generateId(),
        serial: 'myst-serial',
        name: 'myst-name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.1',
        socketPort: 4449,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      inputRunner.label = {
        $namespace: MystIdentityModel.name,
        id: identifierMock.generateId(),
        identity: 'identity1',
      };

      inputVpnProvider = new VpnProviderModel({
        id: identifierMock.generateId(),
        userIdentity: 'identity1',
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        country: 'GB',
        isRegister: false,
        insertDate: new Date(),
      });

      outputVpnProviderConnectData = new VpnProviderModel({
        id: identifierMock.generateId(),
        userIdentity: 'identity1',
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        ip: '45.84.121.22',
        country: 'GB',
        isRegister: true,
        providerStatus: VpnProviderStatusEnum.ONLINE,
        insertDate: new Date(),
      });
    });

    it(`Should error connect to vpn`, async () => {
      mystProviderApiRepository.connect.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.connect(inputRunner, inputVpnProvider);

      expect(mystProviderApiRepository.connect).toHaveBeenCalled();
      expect(mystProviderApiRepository.connect).toHaveBeenCalledWith(inputRunner, inputVpnProvider);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully connect to vpn`, async () => {
      mystProviderApiRepository.connect.mockResolvedValue([null, outputVpnProviderConnectData]);

      const [error, result] = await repository.connect(inputRunner, inputVpnProvider);

      expect(mystProviderApiRepository.connect).toHaveBeenCalled();
      expect(mystProviderApiRepository.connect).toHaveBeenCalledWith(inputRunner, inputVpnProvider);
      expect(error).toBeNull();
      expect(result).toEqual<Omit<VpnProviderModel, 'clone'>>({
        id: inputVpnProvider.id,
        userIdentity: inputVpnProvider.userIdentity,
        serviceType: inputVpnProvider.serviceType,
        providerName: inputVpnProvider.providerName,
        providerIdentity: inputVpnProvider.providerIdentity,
        providerIpType: inputVpnProvider.providerIpType,
        ip: outputVpnProviderConnectData.ip,
        country: inputVpnProvider.country,
        isRegister: true,
        providerStatus: VpnProviderStatusEnum.ONLINE,
        insertDate: inputVpnProvider.insertDate,
      });
    });
  });

  describe(`Disconnect from vpn`, () => {
    let inputRunner: RunnerModel<MystIdentityModel>;
    let inputForce: boolean;

    beforeEach(() => {
      inputRunner = new RunnerModel<MystIdentityModel>({
        id: identifierMock.generateId(),
        serial: 'myst-serial',
        name: 'myst-name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.1',
        socketPort: 4449,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      inputRunner.label = {
        $namespace: MystIdentityModel.name,
        id: identifierMock.generateId(),
        identity: 'identity1',
      };
      inputForce = true;
    });

    it(`Should error disconnect from vpn`, async () => {
      mystProviderApiRepository.disconnect.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.disconnect(inputRunner);

      expect(mystProviderApiRepository.disconnect).toHaveBeenCalled();
      expect(mystProviderApiRepository.disconnect).toHaveBeenCalledWith(inputRunner, undefined);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully disconnect from vpn`, async () => {
      mystProviderApiRepository.disconnect.mockResolvedValue([null, null]);

      const [error, result] = await repository.disconnect(inputRunner);

      expect(mystProviderApiRepository.disconnect).toHaveBeenCalled();
      expect(mystProviderApiRepository.disconnect).toHaveBeenCalledWith(inputRunner, undefined);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should successfully disconnect from vpn (with force flag)`, async () => {
      mystProviderApiRepository.disconnect.mockResolvedValue([null, null]);

      const [error, result] = await repository.disconnect(inputRunner, inputForce);

      expect(mystProviderApiRepository.disconnect).toHaveBeenCalled();
      expect(mystProviderApiRepository.disconnect).toHaveBeenCalledWith(inputRunner, inputForce);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });

  describe(`Register identity`, () => {
    let inputRunner: RunnerModel<MystIdentityModel>;
    let inputUserIdentity: string;

    beforeEach(() => {
      inputRunner = new RunnerModel<MystIdentityModel>({
        id: identifierMock.generateId(),
        serial: 'myst-serial',
        name: 'myst-name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.1',
        socketPort: 4449,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      inputRunner.label = {
        $namespace: MystIdentityModel.name,
        id: identifierMock.generateId(),
        identity: 'identity1',
      };

      inputUserIdentity = 'identity1';
    });

    it(`Should error register identity`, async () => {
      mystProviderApiRepository.registerIdentity.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.registerIdentity(inputRunner, inputUserIdentity);

      expect(mystProviderApiRepository.registerIdentity).toHaveBeenCalled();
      expect(mystProviderApiRepository.registerIdentity).toHaveBeenCalledWith(inputRunner, inputUserIdentity);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully register identity`, async () => {
      mystProviderApiRepository.registerIdentity.mockResolvedValue([null, null]);

      const [error, result] = await repository.registerIdentity(inputRunner, inputUserIdentity);

      expect(mystProviderApiRepository.registerIdentity).toHaveBeenCalled();
      expect(mystProviderApiRepository.registerIdentity).toHaveBeenCalledWith(inputRunner, inputUserIdentity);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });

  describe(`Unlock identity`, () => {
    let inputRunner: RunnerModel<MystIdentityModel>;
    let inputMystIdentity: MystIdentityModel;

    beforeEach(() => {
      inputRunner = new RunnerModel<MystIdentityModel>({
        id: identifierMock.generateId(),
        serial: 'myst-serial',
        name: 'myst-name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.1',
        socketPort: 4449,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      inputRunner.label = {
        $namespace: MystIdentityModel.name,
        id: identifierMock.generateId(),
        identity: 'identity1',
      };

      inputMystIdentity = new MystIdentityModel({
        id: identifierMock.generateId(),
        identity: 'identity1',
        passphrase: 'passphrase identity1',
        path: '/path/of/identity1',
        filename: 'identity1.json',
        isUse: true,
        insertDate: new Date(),
      });
    });

    it(`Should error unlock identity`, async () => {
      mystProviderApiRepository.unlockIdentity.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.unlockIdentity(inputRunner, inputMystIdentity);

      expect(mystProviderApiRepository.unlockIdentity).toHaveBeenCalled();
      expect(mystProviderApiRepository.unlockIdentity).toHaveBeenCalledWith(inputRunner, inputMystIdentity);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully unlock identity`, async () => {
      mystProviderApiRepository.unlockIdentity.mockResolvedValue([null, null]);

      const [error, result] = await repository.unlockIdentity(inputRunner, inputMystIdentity);

      expect(mystProviderApiRepository.unlockIdentity).toHaveBeenCalled();
      expect(mystProviderApiRepository.unlockIdentity).toHaveBeenCalledWith(inputRunner, inputMystIdentity);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });
});
