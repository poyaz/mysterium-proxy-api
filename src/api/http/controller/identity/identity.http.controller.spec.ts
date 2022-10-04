import {Test, TestingModule} from '@nestjs/testing';
import {IdentityHttpController} from './identity.http.controller';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {IMystIdentityServiceInterface} from '@src-core/interface/i-myst-identity-service.interface';
import {IUsersServiceInterface} from '@src-core/interface/i-users-service.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {FindIdentityQueryDto} from '@src-api/http/controller/identity/dto/find-identity-query.dto';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {FilterInstanceType, FilterModel, FilterOperationType} from '@src-core/model/filter.model';
import {UsersModel} from '@src-core/model/users.model';
import {CreateIdentityInputDto} from '@src-api/http/controller/identity/dto/create-identity-input.dto';
import {PassThrough} from 'stream';

describe('IdentityController', () => {
  let controller: IdentityHttpController;
  let mystIdentityService: MockProxy<IMystIdentityServiceInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    mystIdentityService = mock<IMystIdentityServiceInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentityHttpController],
      providers: [
        {
          provide: ProviderTokenEnum.MYST_IDENTITY_SERVICE,
          useValue: mystIdentityService,
        },
      ],
    }).compile();

    controller = module.get<IdentityHttpController>(IdentityHttpController);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe(`Find all myst identity`, () => {
    let inputFindMystIdentityQueryDto: FindIdentityQueryDto;
    let inputEmptyFindMystIdentityQueryDto: FindIdentityQueryDto;
    let outputMystIdentityModel1: MystIdentityModel;

    beforeEach(() => {
      inputFindMystIdentityQueryDto = new FindIdentityQueryDto();
      inputFindMystIdentityQueryDto.filters = {isUse: true};

      inputEmptyFindMystIdentityQueryDto = new FindIdentityQueryDto();

      outputMystIdentityModel1 = new MystIdentityModel({
        id: identifierMock.generateId(),
        identity: 'identity1',
        passphrase: 'pass1',
        path: '/path/of/identity1',
        filename: 'identity1.json',
        isUse: true,
        insertDate: new Date(),
      });
    });

    it(`Should error find all myst identity without filter`, async () => {
      mystIdentityService.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.findAll(inputEmptyFindMystIdentityQueryDto);

      expect(mystIdentityService.getAll).toHaveBeenCalled();
      expect(mystIdentityService.getAll).toBeCalledWith(new FilterModel<MystIdentityModel>());
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error find all myst identity with filter`, async () => {
      mystIdentityService.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.findAll(inputFindMystIdentityQueryDto);

      expect(mystIdentityService.getAll).toHaveBeenCalled();
      expect(mystIdentityService.getAll.mock.calls[0][0].getCondition('isUse')).toMatchObject(<FilterInstanceType<MystIdentityModel> & { $opr: FilterOperationType }>{
        $opr: 'eq',
        isUse: true,
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error find all myst identity with empty record`, async () => {
      mystIdentityService.getAll.mockResolvedValue([null, [], 0]);

      const [error, result] = await controller.findAll(inputEmptyFindMystIdentityQueryDto);

      expect(mystIdentityService.getAll).toHaveBeenCalled();
      expect(mystIdentityService.getAll).toBeCalledWith(new FilterModel<MystIdentityModel>());
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
    });

    it(`Should error find all myst identity with empty record`, async () => {
      mystIdentityService.getAll.mockResolvedValue([null, [outputMystIdentityModel1], 1]);

      const [error, result] = await controller.findAll(inputFindMystIdentityQueryDto);

      expect(mystIdentityService.getAll).toHaveBeenCalled();
      expect(mystIdentityService.getAll.mock.calls[0][0].getCondition('isUse')).toMatchObject(<FilterInstanceType<MystIdentityModel> & { $opr: FilterOperationType }>{
        $opr: 'eq',
        isUse: true,
      });
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject(<MystIdentityModel>{
        id: outputMystIdentityModel1.id,
        identity: outputMystIdentityModel1.identity,
        isUse: outputMystIdentityModel1.isUse,
        insertDate: new Date(),
      });
    });
  });

  describe(`Find one myst identity`, () => {
    let inputIdentityId: string;
    let outputMystIdentityModel: MystIdentityModel;

    beforeEach(() => {
      inputIdentityId = identifierMock.generateId();

      outputMystIdentityModel = new MystIdentityModel({
        id: identifierMock.generateId(),
        identity: 'identity1',
        passphrase: 'pass1',
        path: '/path/of/identity1',
        filename: 'identity1.json',
        isUse: true,
        insertDate: new Date(),
      });
    });

    it(`Should error find one myst identity`, async () => {
      mystIdentityService.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.findOne(inputIdentityId);

      expect(mystIdentityService.getById).toHaveBeenCalled();
      expect(mystIdentityService.getById).toBeCalledWith(inputIdentityId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully find one myst identity`, async () => {
      mystIdentityService.getById.mockResolvedValue([null, outputMystIdentityModel]);

      const [error, result] = await controller.findOne(inputIdentityId);

      expect(mystIdentityService.getById).toHaveBeenCalled();
      expect(mystIdentityService.getById).toBeCalledWith(inputIdentityId);
      expect(error).toBeNull();
      expect(result).toMatchObject(<MystIdentityModel>{
        id: outputMystIdentityModel.id,
        identity: outputMystIdentityModel.identity,
        isUse: outputMystIdentityModel.isUse,
        insertDate: new Date(),
      });
    });
  });

  describe(`Create myst identity`, () => {
    let inputCreateMystIdentityDto: CreateIdentityInputDto;
    let inputFileUpload: Express.Multer.File;
    let outputMystIdentityModel: MystIdentityModel;

    beforeEach(() => {
      inputCreateMystIdentityDto = new CreateIdentityInputDto();
      inputCreateMystIdentityDto.passphrase = 'pass';

      inputFileUpload = {
        fieldname: 'file',
        originalname: 'identity.json',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        destination: '/path/of/upload/file',
        filename: 'random-filename',
        path: '/path/of/upload/file/random-filename',
        size: 489,
        stream: new PassThrough(),
        buffer: Buffer.from('data'),
      };

      outputMystIdentityModel = new MystIdentityModel({
        id: identifierMock.generateId(),
        identity: 'identity1',
        passphrase: 'pass1',
        path: '/path/of/identity1',
        filename: 'identity1.json',
        isUse: false,
        insertDate: new Date(),
      });
    });

    it(`Should error create new myst identity`, async () => {
      mystIdentityService.create.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.create(inputCreateMystIdentityDto, inputFileUpload);

      expect(mystIdentityService.create).toHaveBeenCalled();
      expect(mystIdentityService.create).toBeCalledWith(expect.objectContaining(<MystIdentityModel>{
        passphrase: inputCreateMystIdentityDto.passphrase,
        path: inputFileUpload.destination,
        filename: inputFileUpload.filename,
      }));
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully create new myst identity`, async () => {
      mystIdentityService.create.mockResolvedValue([null, outputMystIdentityModel]);

      const [error, result] = await controller.create(inputCreateMystIdentityDto, inputFileUpload);

      expect(mystIdentityService.create).toHaveBeenCalled();
      expect(mystIdentityService.create).toBeCalledWith(expect.objectContaining(<MystIdentityModel>{
        passphrase: inputCreateMystIdentityDto.passphrase,
        path: inputFileUpload.destination,
        filename: inputFileUpload.filename,
      }));
      expect(error).toBeNull();
      expect(result).toMatchObject(<MystIdentityModel>{
        id: outputMystIdentityModel.id,
        identity: outputMystIdentityModel.identity,
        isUse: outputMystIdentityModel.isUse,
        insertDate: new Date(),
      });
    });
  });

  describe(`Remove myst identity`, () => {
    let inputIdentityId: string;

    beforeEach(() => {
      inputIdentityId = identifierMock.generateId();
    });

    it(`Should error remove myst identity`, async () => {
      mystIdentityService.remove.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.remove(inputIdentityId);

      expect(mystIdentityService.remove).toHaveBeenCalled();
      expect(mystIdentityService.remove).toBeCalledWith(inputIdentityId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully remove myst identity`, async () => {
      mystIdentityService.remove.mockResolvedValue([null, null]);

      const [error, result] = await controller.remove(inputIdentityId);

      expect(mystIdentityService.remove).toHaveBeenCalled();
      expect(mystIdentityService.remove).toBeCalledWith(inputIdentityId);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });
});
