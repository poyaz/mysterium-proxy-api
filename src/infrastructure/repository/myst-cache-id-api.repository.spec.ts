import {Test, TestingModule} from '@nestjs/testing';
import axios from 'axios';
import {MystCacheIdApiRepository} from './myst-cache-id-api.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {Redis} from 'ioredis';
import {RedisService} from '@liaoliaots/nestjs-redis';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {IProxyApiRepositoryInterface} from '@src-core/interface/i-proxy-api-repository.interface';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import {RepositoryException} from '@src-core/exception/repository.exception';

jest.mock('axios');

describe('MystCacheIdApiRepository', () => {
  let repository: MystCacheIdApiRepository;
  let redis: MockProxy<Redis>;
  let redisService: MockProxy<RedisService>;
  let mystApiRepository: MockProxy<IProxyApiRepositoryInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    redis = mock<Redis>();
    redisService = mock<RedisService>();
    redisService.getClient.mockReturnValue(redis);
    mystApiRepository = mock<IProxyApiRepositoryInterface>();
    redis.mset;

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RedisService,
          useValue: redisService,
        },
        {
          provide: ProviderTokenEnum.MYST_CACHE_ID_API_REPOSITORY,
          useValue: mystApiRepository,
        },
        {
          provide: MystCacheIdApiRepository,
          inject: [RedisService, ProviderTokenEnum.MYST_CACHE_ID_API_REPOSITORY],
          useFactory: (redisService: RedisService, mystApiRepository: IProxyApiRepositoryInterface) =>
            new MystCacheIdApiRepository(redisService, mystApiRepository),
        },
      ],
    }).compile();

    repository = module.get<MystCacheIdApiRepository>(MystCacheIdApiRepository);

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
    let outputVpnProviderData1: VpnProviderModel;
    let outputVpnProviderData2: VpnProviderModel;

    beforeEach(() => {
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
      mystApiRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getAll();

      expect(mystApiRepository.getAll).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all vpn provider when append to redis`, async () => {
      mystApiRepository.getAll.mockResolvedValue([
        null,
        [outputVpnProviderData1, outputVpnProviderData2],
        2,
      ]);
      const executeError = new Error('Error in create on database');
      redis.mset.mockRejectedValue(executeError);

      const [error] = await repository.getAll();

      expect(mystApiRepository.getAll).toHaveBeenCalled();
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
      mystApiRepository.getAll.mockResolvedValue([
        null,
        [outputVpnProviderData1, outputVpnProviderData2],
        2,
      ]);
      redis.mset.mockResolvedValue(null);
      redis.expire.mockResolvedValue(null);

      const [error, result, totalCount] = await repository.getAll();

      expect(mystApiRepository.getAll).toHaveBeenCalled();
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
});
