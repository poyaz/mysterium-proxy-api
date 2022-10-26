import {Test, TestingModule} from '@nestjs/testing';
import {MystProviderHttpController} from './myst-provider-http.controller';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {mock, MockProxy} from 'jest-mock-extended';
import {IProviderServiceInterface} from '@src-core/interface/i-provider-service.interface';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import {FindProviderQueryDto} from '@src-api/http/controller/provider/dto/find-provider-query.dto';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {FilterInstanceType, FilterModel, FilterOperationType} from '@src-core/model/filter.model';

describe('MystProviderHttpController', () => {
  let controller: MystProviderHttpController;
  let mystProviderService: MockProxy<IProviderServiceInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    mystProviderService = mock<IProviderServiceInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MystProviderHttpController],
      providers: [
        {
          provide: ProviderTokenEnum.MYST_PROVIDER_SERVICE_DEFAULT,
          useValue: mystProviderService,
        },
      ],
    }).compile();

    controller = module.get<MystProviderHttpController>(MystProviderHttpController);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe(`Find all myst vpn provider`, () => {
    let inputFindMystProviderQueryDto: FindProviderQueryDto;
    let inputEmptyFindMystProviderQueryDto: FindProviderQueryDto;
    let outputMystProviderModel1: VpnProviderModel;

    beforeEach(() => {
      inputFindMystProviderQueryDto = new FindProviderQueryDto();
      inputFindMystProviderQueryDto.filters = {
        country: 'GB',
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        providerIdentity: '0x1a225ab3545',
        isRegister: false,
      };

      inputEmptyFindMystProviderQueryDto = new FindProviderQueryDto();

      outputMystProviderModel1 = new VpnProviderModel({
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        country: 'GB',
        isRegister: false,
        insertDate: new Date(),
      });
    });

    it(`Should error find all myst vpn provider without filter`, async () => {
      mystProviderService.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.findAll(inputEmptyFindMystProviderQueryDto);

      expect(mystProviderService.getAll).toHaveBeenCalled();
      expect(mystProviderService.getAll).toBeCalledWith(new FilterModel<VpnProviderModel>());
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error find all myst vpn provider with filter`, async () => {
      mystProviderService.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.findAll(inputFindMystProviderQueryDto);

      expect(mystProviderService.getAll).toHaveBeenCalled();
      expect(mystProviderService.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(4);
      expect(mystProviderService.getAll.mock.calls[0][0].getConditionList()).toEqual(expect.arrayContaining<FilterInstanceType<VpnProviderModel> & { $opr: FilterOperationType }>([
        {
          $opr: 'eq',
          country: inputFindMystProviderQueryDto.filters.country,
        },
        {
          $opr: 'eq',
          providerIpType: inputFindMystProviderQueryDto.filters.providerIpType,
        },
        {
          $opr: 'eq',
          providerIdentity: inputFindMystProviderQueryDto.filters.providerIdentity,
        },
        {
          $opr: 'eq',
          isRegister: inputFindMystProviderQueryDto.filters.isRegister,
        },
      ]));
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully find all myst vpn provider with empty record`, async () => {
      mystProviderService.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, total] = await controller.findAll(inputEmptyFindMystProviderQueryDto);

      expect(mystProviderService.getAll).toHaveBeenCalled();
      expect(mystProviderService.getAll).toBeCalledWith(new FilterModel<VpnProviderModel>());
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });

    it(`Should successfully find all myst vpn provider`, async () => {
      mystProviderService.getAll.mockResolvedValue([null, [outputMystProviderModel1], 1]);

      const [error, result, total] = await controller.findAll(inputEmptyFindMystProviderQueryDto);

      expect(mystProviderService.getAll).toHaveBeenCalled();
      expect(mystProviderService.getAll).toBeCalledWith(new FilterModel<VpnProviderModel>());
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject<Omit<VpnProviderModel, 'clone'>>({
        id: outputMystProviderModel1.id,
        serviceType: outputMystProviderModel1.serviceType,
        providerName: outputMystProviderModel1.providerName,
        providerIdentity: outputMystProviderModel1.providerIdentity,
        providerIpType: outputMystProviderModel1.providerIpType,
        country: outputMystProviderModel1.country,
        isRegister: outputMystProviderModel1.isRegister,
        insertDate: outputMystProviderModel1.insertDate,
      });
      expect(total).toEqual(1);
    });
  });

  describe(`Connect myst vpn provider`, () => {
    let inputProviderId: string;
    let outputMystProviderModel: VpnProviderModel;

    beforeEach(() => {
      inputProviderId = identifierMock.generateId();

      outputMystProviderModel = new VpnProviderModel({
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        country: 'GB',
        isRegister: false,
        insertDate: new Date(),
      });
    });

    it(`Should error connect myst vpn provider`, async () => {
      mystProviderService.up.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.connect(inputProviderId);

      expect(mystProviderService.up).toHaveBeenCalled();
      expect(mystProviderService.up).toHaveBeenCalledWith(inputProviderId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully connect myst vpn provider`, async () => {
      mystProviderService.up.mockResolvedValue([null, outputMystProviderModel]);

      const [error, result] = await controller.connect(inputProviderId);

      expect(mystProviderService.up).toHaveBeenCalled();
      expect(mystProviderService.up).toHaveBeenCalledWith(inputProviderId);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });

  describe(`Disconnect myst vpn provider`, () => {
    let inputProviderId: string;

    beforeEach(() => {
      inputProviderId = identifierMock.generateId();
    });

    it(`Should error disconnect myst vpn provider`, async () => {
      mystProviderService.down.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.disconnect(inputProviderId);

      expect(mystProviderService.down).toHaveBeenCalled();
      expect(mystProviderService.down).toHaveBeenCalledWith(inputProviderId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully disconnect myst vpn provider`, async () => {
      mystProviderService.down.mockResolvedValue([null, null]);

      const [error, result] = await controller.disconnect(inputProviderId);

      expect(mystProviderService.down).toHaveBeenCalled();
      expect(mystProviderService.down).toHaveBeenCalledWith(inputProviderId);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });
});
