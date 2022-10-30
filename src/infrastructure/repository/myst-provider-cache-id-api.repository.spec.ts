import {Test, TestingModule} from '@nestjs/testing';
import {MystProviderCacheIdApiRepository} from './myst-provider-cache-id-api.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {Redis} from 'ioredis';
import {RedisService} from '@liaoliaots/nestjs-redis';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {Logger} from '@nestjs/common';
import {FilterModel} from '@src-core/model/filter.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {IMystApiRepositoryInterface} from '@src-core/interface/i-myst-api-repository.interface';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {defaultModelFactory} from '@src-core/model/defaultModel';

describe('MystProviderCacheIdApiRepository', () => {
  let repository: MystProviderCacheIdApiRepository;
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
          provide: ProviderTokenEnum.MYST_PROVIDER_CACHE_ID_API_REPOSITORY,
          useValue: mystProviderApiRepository,
        },
        {
          provide: Logger,
          useValue: logger,
        },
        {
          provide: MystProviderCacheIdApiRepository,
          inject: [RedisService, ProviderTokenEnum.MYST_PROVIDER_CACHE_ID_API_REPOSITORY, Logger],
          useFactory: (redisService: RedisService, mystProviderApiRepository: IMystApiRepositoryInterface, logger: Logger) =>
            new MystProviderCacheIdApiRepository(redisService, mystProviderApiRepository, logger),
        },
      ],
    }).compile();

    repository = module.get<MystProviderCacheIdApiRepository>(MystProviderCacheIdApiRepository);

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
    });

    it(`Should error get all vpn provider when get data`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getAll(inputRunnerModel);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all vpn provider when append to redis`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([
        null,
        [outputVpnProviderData1, outputVpnProviderData2],
        2,
      ]);
      const executeError = new Error('Error in execute set on database');
      redis.mset.mockRejectedValue(executeError);

      const [error] = await repository.getAll(inputRunnerModel);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(redis.mset).toHaveBeenCalled();
      expect(redis.mset).toBeCalledWith(expect.arrayContaining([
        `myst_provider:${outputVpnProviderData1.id}`,
        outputVpnProviderData1.providerIdentity,
        `myst_provider:${outputVpnProviderData2.id}`,
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
      redis.mset.mockResolvedValue(null);
      redis.expire.mockResolvedValue(null);

      const [error, result, totalCount] = await repository.getAll(inputRunnerModel);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(redis.mset).toHaveBeenCalled();
      expect(redis.mset).toBeCalledWith(expect.arrayContaining([
        `myst_provider:${outputVpnProviderData1.id}`,
        outputVpnProviderData1.providerIdentity,
        `myst_provider:${outputVpnProviderData2.id}`,
        outputVpnProviderData2.providerIdentity,
      ]));
      expect(redis.expire).toHaveBeenCalledTimes(2);
      expect(redis.expire.mock.calls[0]).toEqual(expect.arrayContaining([`myst_provider:${outputVpnProviderData1.id}`, 5 * 60]));
      expect(redis.expire.mock.calls[1]).toEqual(expect.arrayContaining([`myst_provider:${outputVpnProviderData2.id}`, 5 * 60]));
      expect(logger.warn).toHaveBeenCalledTimes(0);
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

    it(`Should successfully get all vpn provider (Async expire key has executed failure)`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([
        null,
        [outputVpnProviderData1, outputVpnProviderData2],
        2,
      ]);
      redis.mset.mockResolvedValue(null);
      redis.expire
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('Error in execute expire on database'));
      logger.error.mockReturnValue(null);

      const [error, result, totalCount] = await repository.getAll(inputRunnerModel);
      jest.advanceTimersToNextTimer(3);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(redis.mset).toHaveBeenCalled();
      expect(redis.mset).toBeCalledWith(expect.arrayContaining([
        `myst_provider:${outputVpnProviderData1.id}`,
        outputVpnProviderData1.providerIdentity,
        `myst_provider:${outputVpnProviderData2.id}`,
        outputVpnProviderData2.providerIdentity,
      ]));
      expect(redis.expire).toHaveBeenCalledTimes(2);
      expect(redis.expire.mock.calls[0]).toEqual(expect.arrayContaining([`myst_provider:${outputVpnProviderData1.id}`, 5 * 60]));
      expect(redis.expire.mock.calls[1]).toEqual(expect.arrayContaining([`myst_provider:${outputVpnProviderData2.id}`, 5 * 60]));
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

      const [error, result] = await repository.getById(inputRunnerModel, inputId);

      expect(redis.get).toHaveBeenCalled();
      expect(logger.error).toBeCalledTimes(0);
      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<VpnProviderModel>>mystProviderApiRepository.getAll.mock.calls[0][1]).getCondition('providerIdentity')).toMatchObject({
        $opr: 'eq',
        providerIdentity: outputVpnProviderData.providerIdentity,
      });
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
  });
});