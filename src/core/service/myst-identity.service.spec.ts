import {Test, TestingModule} from '@nestjs/testing';
import {MystIdentityService} from './myst-identity.service';
import {mock, MockProxy} from 'jest-mock-extended';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {FilterModel} from '@src-core/model/filter.model';
import {NotFoundMystIdentityException} from '@src-core/exception/not-found-myst-identity.exception';

describe('MystIdentityService', () => {
  let service: MystIdentityService;
  let mystIdentityAggRepository: MockProxy<IGenericRepositoryInterface<MystIdentityModel>>;
  let identifierMock: MockProxy<IIdentifier>;
  let fakeIdentifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    mystIdentityAggRepository = mock<IGenericRepositoryInterface<MystIdentityModel>>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    fakeIdentifierMock = mock<IIdentifier>();
    fakeIdentifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.MYST_IDENTITY_AGGREGATE_REPOSITORY,
          useValue: mystIdentityAggRepository,
        },
        {
          provide: MystIdentityService,
          inject: [ProviderTokenEnum.MYST_IDENTITY_AGGREGATE_REPOSITORY],
          useFactory: (mystIdentityAggRepository: IGenericRepositoryInterface<MystIdentityModel>) =>
            new MystIdentityService(mystIdentityAggRepository),
        },
      ],
    }).compile();

    service = module.get<MystIdentityService>(MystIdentityService);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe(`Get all myst identity`, () => {
    let inputFilterModel: FilterModel<MystIdentityModel>;
    let outputMystIdentityData1: MystIdentityModel;
    let outputMystIdentityData2: MystIdentityModel;

    beforeEach(() => {
      inputFilterModel = new FilterModel<MystIdentityModel>();

      outputMystIdentityData1 = new MystIdentityModel({
        id: identifierMock.generateId(),
        identity: 'identity1',
        passphrase: 'pass1',
        path: '/path/of/identity1',
        filename: 'identity1.json',
        isUse: false,
        insertDate: new Date(),
      });

      outputMystIdentityData2 = new MystIdentityModel({
        id: identifierMock.generateId(),
        identity: 'identity2',
        passphrase: 'pass2',
        path: '/path/of/identity2',
        filename: 'identity2.json',
        isUse: true,
        insertDate: new Date(),
      });
    });

    it(`Should error get all myst identity`, async () => {
      mystIdentityAggRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getAll(inputFilterModel);

      expect(mystIdentityAggRepository.getAll).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get all myst identity`, async () => {
      mystIdentityAggRepository.getAll.mockResolvedValue([null, [outputMystIdentityData1, outputMystIdentityData2], 2]);

      const [error, result, count] = await service.getAll(inputFilterModel);

      expect(mystIdentityAggRepository.getAll).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result.length).toEqual(2);
      expect(count).toEqual(2);
    });
  });

  describe(`Get all myst identity`, () => {
    let inputId: string;
    let outputMystIdentityData: MystIdentityModel;

    beforeEach(() => {
      inputId = identifierMock.generateId();

      outputMystIdentityData = new MystIdentityModel({
        id: identifierMock.generateId(),
        identity: 'identity1',
        passphrase: 'pass1',
        path: '/path/of/identity1',
        filename: 'identity1.json',
        isUse: false,
        insertDate: new Date(),
      });
    });

    it(`Should error get myst identity by id`, async () => {
      mystIdentityAggRepository.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getById(inputId);

      expect(mystIdentityAggRepository.getById).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get myst identity by id when not found record`, async () => {
      mystIdentityAggRepository.getById.mockResolvedValue([null, null]);

      const [error] = await service.getById(inputId);

      expect(mystIdentityAggRepository.getById).toHaveBeenCalled();
      expect(error).toBeInstanceOf(NotFoundMystIdentityException);
    });

    it(`Should successfully get myst identity by id`, async () => {
      mystIdentityAggRepository.getById.mockResolvedValue([null, outputMystIdentityData]);

      const [error, result] = await service.getById(inputId);

      expect(mystIdentityAggRepository.getById).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toMatchObject(<MystIdentityModel>{
        id: outputMystIdentityData.id,
        identity: outputMystIdentityData.identity,
        passphrase: outputMystIdentityData.passphrase,
        path: outputMystIdentityData.path,
        filename: outputMystIdentityData.filename,
        isUse: outputMystIdentityData.isUse,
        insertDate: outputMystIdentityData.insertDate,
      });
    });
  });
});
