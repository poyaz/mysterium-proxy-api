import {Test, TestingModule} from '@nestjs/testing';
import {MystProviderService} from './myst-provider.service';
import {mock, MockProxy} from 'jest-mock-extended';
import {IRunnerServiceInterface} from '@src-core/interface/i-runner-service.interface';
import {IMystApiRepositoryInterface} from '@src-core/interface/i-myst-api-repository.interface';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {FilterModel, SortEnum} from '@src-core/model/filter.model';
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName,
  VpnProviderStatusEnum,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {DefaultModel} from '@src-core/model/defaultModel';

describe('MystProviderService', () => {
  let service: MystProviderService;
  let mystApiRepository: MockProxy<IMystApiRepositoryInterface>;
  let dockerRunnerService: MockProxy<IRunnerServiceInterface>;
  let identifierMock: MockProxy<IIdentifier>;
  let fakeIdentifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    mystApiRepository = mock<IMystApiRepositoryInterface>();
    dockerRunnerService = mock<IRunnerServiceInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    fakeIdentifierMock = mock<IIdentifier>();
    fakeIdentifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.MYST_PROVIDER_AGGREGATE_REPOSITORY,
          useValue: mystApiRepository,
        },
        {
          provide: ProviderTokenEnum.DOCKER_RUNNER_SERVICE,
          useValue: dockerRunnerService,
        },
        {
          provide: MystProviderService,
          inject: [ProviderTokenEnum.MYST_PROVIDER_AGGREGATE_REPOSITORY],
          useFactory: (
            mystApiRepository: IMystApiRepositoryInterface,
            dockerRunnerService: IRunnerServiceInterface,
          ) =>
            new MystProviderService(mystApiRepository, dockerRunnerService),
        },
      ],
    }).compile();

    service = module.get<MystProviderService>(MystProviderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe(`Get all provider`, () => {
    let inputWithFilter: FilterModel<VpnProviderModel>;
    let inputWithoutFilter: FilterModel<VpnProviderModel>;
    let outputVpnModel1: VpnProviderModel;

    beforeEach(() => {
      inputWithFilter = new FilterModel<VpnProviderModel>();
      inputWithFilter.addCondition({$opr: 'eq', country: 'GB'});

      inputWithoutFilter = new FilterModel<VpnProviderModel>();

      outputVpnModel1 = new VpnProviderModel({
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerStatus: VpnProviderStatusEnum.ONLINE,
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        country: 'GB',
        isRegister: false,
        insertDate: new Date(),
      });
    });

    it(`Should error get all provider without filter`, async () => {
      mystApiRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getAll();

      expect(mystApiRepository.getAll).toHaveBeenCalled();
      expect(mystApiRepository.getAll.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getAll.mock.calls[0][1]).toBeUndefined();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all provider with filter`, async () => {
      mystApiRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getAll(inputWithFilter);

      expect(mystApiRepository.getAll).toHaveBeenCalled();
      expect(mystApiRepository.getAll.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getAll.mock.calls[0][1]).toBeInstanceOf(FilterModel);
      expect((<FilterModel<VpnProviderModel>>mystApiRepository.getAll.mock.calls[0][1]).getLengthOfCondition()).toEqual(1);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all provider with empty filter`, async () => {
      mystApiRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getAll(inputWithoutFilter);

      expect(mystApiRepository.getAll).toHaveBeenCalled();
      expect(mystApiRepository.getAll.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getAll.mock.calls[0][1]).toBeInstanceOf(FilterModel);
      expect((<FilterModel<VpnProviderModel>>mystApiRepository.getAll.mock.calls[0][1]).getLengthOfCondition()).toEqual(0);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get all provider with empty records`, async () => {
      mystApiRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, total] = await service.getAll();

      expect(mystApiRepository.getAll).toHaveBeenCalled();
      expect(mystApiRepository.getAll.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getAll.mock.calls[0][1]).toBeUndefined();
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });

    it(`Should successfully get all provider`, async () => {
      mystApiRepository.getAll.mockResolvedValue([null, [outputVpnModel1], 1]);

      const [error, result, total] = await service.getAll();

      expect(mystApiRepository.getAll).toHaveBeenCalled();
      expect(mystApiRepository.getAll.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getAll.mock.calls[0][1]).toBeUndefined();
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual<Omit<VpnProviderModel, 'clone'>>({
        id: outputVpnModel1.id,
        serviceType: outputVpnModel1.serviceType,
        providerName: outputVpnModel1.providerName,
        providerIdentity: outputVpnModel1.providerIdentity,
        providerStatus: outputVpnModel1.providerStatus,
        providerIpType: outputVpnModel1.providerIpType,
        country: outputVpnModel1.country,
        isRegister: outputVpnModel1.isRegister,
        insertDate: outputVpnModel1.insertDate,
      });
      expect(total).toEqual(1);
    });
  });
});
