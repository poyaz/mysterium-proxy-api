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
import {IMystApiRepositoryInterface} from '@src-core/interface/i-myst-api-repository.interface';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {IRunnerServiceInterface} from '@src-core/interface/i-runner-service.interface';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {NotRunningServiceException} from '@src-core/exception/not-running-service.exception';
import {NotFoundException} from '@src-core/exception/not-found.exception';
import {CombineException} from '@src-core/exception/combine.exception';

jest.mock('timers/promises');
import {setTimeout} from 'timers/promises';

describe('MystIdentityService', () => {
  let service: MystIdentityService;
  let mystIdentityAggRepository: MockProxy<IGenericRepositoryInterface<MystIdentityModel>>;
  let mystApiRepository: MockProxy<IMystApiRepositoryInterface>;
  let dockerRunnerService: MockProxy<IRunnerServiceInterface>;
  let identifierMock: MockProxy<IIdentifier>;
  let fakeIdentifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    mystIdentityAggRepository = mock<IGenericRepositoryInterface<MystIdentityModel>>();
    mystApiRepository = mock<IMystApiRepositoryInterface>();
    dockerRunnerService = mock<IRunnerServiceInterface>();

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
          provide: ProviderTokenEnum.MYST_API_REPOSITORY,
          useValue: mystApiRepository,
        },
        {
          provide: ProviderTokenEnum.DOCKER_RUNNER_SERVICE,
          useValue: dockerRunnerService,
        },
        {
          provide: MystIdentityService,
          inject: [
            ProviderTokenEnum.MYST_IDENTITY_AGGREGATE_REPOSITORY,
            ProviderTokenEnum.MYST_API_REPOSITORY,
            ProviderTokenEnum.DOCKER_RUNNER_SERVICE,
          ],
          useFactory: (
            mystIdentityAggRepository: IGenericRepositoryInterface<MystIdentityModel>,
            mystApiRepository: IMystApiRepositoryInterface,
            dockerRunnerService: IRunnerServiceInterface,
          ) =>
            new MystIdentityService(mystIdentityAggRepository, mystApiRepository, dockerRunnerService),
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

  describe(`Create new myst identity`, () => {
    let inputModel: MystIdentityModel;
    let outputMystIdentityModel: MystIdentityModel;
    let outputRunnerMystNotRunningModel1: RunnerModel<MystIdentityModel>;
    let outputRunnerMystRunningModel2: RunnerModel<MystIdentityModel>;

    beforeEach(() => {
      inputModel = defaultModelFactory<MystIdentityModel>(MystIdentityModel, {
        id: 'default-id',
        identity: 'identity1',
        passphrase: 'pass1',
        path: '/tmp/path/of/identity1',
        filename: 'tmp-identity1-file',
        isUse: false,
        insertDate: new Date(),
      }, ['id', 'isUse', 'insertDate']);

      outputMystIdentityModel = new MystIdentityModel({
        id: identifierMock.generateId(),
        identity: 'identity1',
        passphrase: 'pass1',
        path: '/path/of/identity1',
        filename: 'identity1.json',
        isUse: false,
        insertDate: new Date(),
      });

      outputRunnerMystNotRunningModel1 = new RunnerModel<MystIdentityModel>({
        id: identifierMock.generateId(),
        serial: 'runner name serial',
        name: 'runner myst name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.1',
        socketPort: 4449,
        status: RunnerStatusEnum.CREATING,
        insertDate: new Date(),
      });

      outputRunnerMystRunningModel2 = new RunnerModel<MystIdentityModel>({
        id: identifierMock.generateId(),
        serial: 'runner name serial',
        name: 'runner myst name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.1',
        socketPort: 4449,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
    });

    it(`Should error add new myst identity when create identity`, async () => {
      mystIdentityAggRepository.add.mockResolvedValue([new UnknownException()]);

      const [error] = await service.create(inputModel);

      expect(mystIdentityAggRepository.add).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new myst identity when get runner info`, async () => {
      mystIdentityAggRepository.add.mockResolvedValue([null, outputMystIdentityModel]);
      (<jest.Mock>setTimeout).mockResolvedValue(null);
      dockerRunnerService.findAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.create(inputModel);

      expect(mystIdentityAggRepository.add).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenLastCalledWith(2000, expect.anything());
      expect(dockerRunnerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          identity: inputModel.identity,
        },
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new myst identity when get runner info`, async () => {
      mystIdentityAggRepository.add.mockResolvedValue([null, outputMystIdentityModel]);
      (<jest.Mock>setTimeout).mockResolvedValue(null);
      dockerRunnerService.findAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.create(inputModel);

      expect(mystIdentityAggRepository.add).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenLastCalledWith(2000, expect.anything());
      expect(dockerRunnerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          identity: inputModel.identity,
        },
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new myst identity when not found runner`, async () => {
      mystIdentityAggRepository.add.mockResolvedValue([null, outputMystIdentityModel]);
      (<jest.Mock>setTimeout).mockResolvedValue(null);
      dockerRunnerService.findAll.mockResolvedValue([null, [], 0]);

      const [error] = await service.create(inputModel);

      expect(mystIdentityAggRepository.add).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenLastCalledWith(2000, expect.anything());
      expect(dockerRunnerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          identity: inputModel.identity,
        },
      });
      expect(error).toBeInstanceOf(NotFoundException);
    });

    it(`Should error add new myst identity when myst not running`, async () => {
      mystIdentityAggRepository.add.mockResolvedValue([null, outputMystIdentityModel]);
      (<jest.Mock>setTimeout).mockResolvedValue(null);
      dockerRunnerService.findAll.mockResolvedValue([null, [outputRunnerMystNotRunningModel1], 1]);

      const [error] = await service.create(inputModel);

      expect(mystIdentityAggRepository.add).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenLastCalledWith(2000, expect.anything());
      expect(dockerRunnerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          identity: inputModel.identity,
        },
      });
      expect(error).toBeInstanceOf(NotRunningServiceException);
    });

    it(`Should error add new myst identity when unlock identity (Also fail on remove runner)`, async () => {
      mystIdentityAggRepository.add.mockResolvedValue([null, outputMystIdentityModel]);
      (<jest.Mock>setTimeout).mockResolvedValue(null);
      dockerRunnerService.findAll.mockResolvedValue([null, [outputRunnerMystRunningModel2], 1]);
      mystApiRepository.unlockIdentity.mockResolvedValue([new UnknownException()]);
      mystIdentityAggRepository.remove.mockResolvedValue([new UnknownException()]);

      const [error] = await service.create(inputModel);

      expect(mystIdentityAggRepository.add).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenLastCalledWith(2000, expect.anything());
      expect(dockerRunnerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          identity: inputModel.identity,
        },
      });
      expect(mystApiRepository.unlockIdentity).toHaveBeenCalled();
      expect(mystApiRepository.unlockIdentity).toHaveBeenCalledWith(outputRunnerMystRunningModel2, outputMystIdentityModel);
      expect(mystIdentityAggRepository.remove).toHaveBeenCalled();
      expect(mystIdentityAggRepository.remove).toHaveBeenCalledWith(outputMystIdentityModel.id);
      expect(error).toBeInstanceOf(CombineException);
      expect((<CombineException>error).combineInfo.length).toEqual(2);
    });

    it(`Should error add new myst identity when unlock identity (Also success on remove runner)`, async () => {
      mystIdentityAggRepository.add.mockResolvedValue([null, outputMystIdentityModel]);
      (<jest.Mock>setTimeout).mockResolvedValue(null);
      dockerRunnerService.findAll.mockResolvedValue([null, [outputRunnerMystRunningModel2], 1]);
      mystApiRepository.unlockIdentity.mockResolvedValue([new UnknownException()]);
      mystIdentityAggRepository.remove.mockResolvedValue([null]);

      const [error] = await service.create(inputModel);

      expect(mystIdentityAggRepository.add).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenLastCalledWith(2000, expect.anything());
      expect(dockerRunnerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          identity: inputModel.identity,
        },
      });
      expect(mystApiRepository.unlockIdentity).toHaveBeenCalled();
      expect(mystApiRepository.unlockIdentity).toHaveBeenCalledWith(outputRunnerMystRunningModel2, outputMystIdentityModel);
      expect(mystIdentityAggRepository.remove).toHaveBeenCalled();
      expect(mystIdentityAggRepository.remove).toHaveBeenCalledWith(outputMystIdentityModel.id);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new myst identity when register identity (Also fail on remove runner)`, async () => {
      mystIdentityAggRepository.add.mockResolvedValue([null, outputMystIdentityModel]);
      (<jest.Mock>setTimeout).mockResolvedValue(null);
      dockerRunnerService.findAll.mockResolvedValue([null, [outputRunnerMystRunningModel2], 1]);
      mystApiRepository.unlockIdentity.mockResolvedValue([null]);
      mystApiRepository.registerIdentity.mockResolvedValue([new UnknownException()]);
      mystIdentityAggRepository.remove.mockResolvedValue([new UnknownException()]);

      const [error] = await service.create(inputModel);

      expect(mystIdentityAggRepository.add).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenLastCalledWith(2000, expect.anything());
      expect(dockerRunnerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          identity: inputModel.identity,
        },
      });
      expect(mystApiRepository.unlockIdentity).toHaveBeenCalled();
      expect(mystApiRepository.unlockIdentity).toHaveBeenCalledWith(outputRunnerMystRunningModel2, outputMystIdentityModel);
      expect(mystApiRepository.registerIdentity).toHaveBeenCalled();
      expect(mystApiRepository.registerIdentity).toHaveBeenCalledWith(outputRunnerMystRunningModel2, outputMystIdentityModel.identity);
      expect(mystIdentityAggRepository.remove).toHaveBeenCalled();
      expect(mystIdentityAggRepository.remove).toHaveBeenCalledWith(outputMystIdentityModel.id);
      expect(error).toBeInstanceOf(CombineException);
      expect((<CombineException>error).combineInfo.length).toEqual(2);
    });

    it(`Should error add new myst identity when register identity (Also success on remove runner)`, async () => {
      mystIdentityAggRepository.add.mockResolvedValue([null, outputMystIdentityModel]);
      (<jest.Mock>setTimeout).mockResolvedValue(null);
      dockerRunnerService.findAll.mockResolvedValue([null, [outputRunnerMystRunningModel2], 1]);
      mystApiRepository.unlockIdentity.mockResolvedValue([null]);
      mystApiRepository.registerIdentity.mockResolvedValue([new UnknownException()]);
      mystIdentityAggRepository.remove.mockResolvedValue([null]);

      const [error] = await service.create(inputModel);

      expect(mystIdentityAggRepository.add).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenLastCalledWith(2000, expect.anything());
      expect(dockerRunnerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          identity: inputModel.identity,
        },
      });
      expect(mystApiRepository.unlockIdentity).toHaveBeenCalled();
      expect(mystApiRepository.unlockIdentity).toHaveBeenCalledWith(outputRunnerMystRunningModel2, outputMystIdentityModel);
      expect(mystApiRepository.registerIdentity).toHaveBeenCalled();
      expect(mystApiRepository.registerIdentity).toHaveBeenCalledWith(outputRunnerMystRunningModel2, outputMystIdentityModel.identity);
      expect(mystIdentityAggRepository.remove).toHaveBeenCalled();
      expect(mystIdentityAggRepository.remove).toHaveBeenCalledWith(outputMystIdentityModel.id);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully add new myst identity when register identity`, async () => {
      mystIdentityAggRepository.add.mockResolvedValue([null, outputMystIdentityModel]);
      (<jest.Mock>setTimeout).mockResolvedValue(null);
      dockerRunnerService.findAll.mockResolvedValue([null, [outputRunnerMystRunningModel2], 1]);
      mystApiRepository.unlockIdentity.mockResolvedValue([null]);
      mystApiRepository.registerIdentity.mockResolvedValue([null]);

      const [error, result] = await service.create(inputModel);

      expect(mystIdentityAggRepository.add).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenLastCalledWith(2000, expect.anything());
      expect(dockerRunnerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          identity: inputModel.identity,
        },
      });
      expect(mystApiRepository.unlockIdentity).toHaveBeenCalled();
      expect(mystApiRepository.unlockIdentity).toHaveBeenCalledWith(outputRunnerMystRunningModel2, outputMystIdentityModel);
      expect(mystApiRepository.registerIdentity).toHaveBeenCalled();
      expect(mystApiRepository.registerIdentity).toHaveBeenCalledWith(outputRunnerMystRunningModel2, outputMystIdentityModel.identity);
      expect(error).toBeNull();
      expect(result).toMatchObject(<MystIdentityModel>{
        id: outputMystIdentityModel.id,
        identity: outputMystIdentityModel.identity,
        passphrase: outputMystIdentityModel.passphrase,
        path: outputMystIdentityModel.path,
        filename: outputMystIdentityModel.filename,
        isUse: outputMystIdentityModel.isUse,
        insertDate: outputMystIdentityModel.insertDate,
      });
    });
  });

  describe(`Remove identity`, () => {
    let inputId: string;

    beforeEach(() => {
      inputId = identifierMock.generateId();
    });

    it(`Should error remove identity`, async () => {
      mystIdentityAggRepository.remove.mockResolvedValue([new UnknownException()]);

      const [error] = await service.remove(inputId);

      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully remove identity`, async () => {
      mystIdentityAggRepository.remove.mockResolvedValue([null, null]);

      const [error] = await service.remove(inputId);

      expect(error).toBeNull();
    });
  });
});
