import {DockerRunnerCreateStrategyRepository} from './docker-runner-create-strategy.repository';
import {Test, TestingModule} from '@nestjs/testing';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ICreateRunnerRepository} from '@src-core/interface/i-create-runner-repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerServiceVolumeEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {RepositoryException} from '@src-core/exception/repository.exception';

describe('DockerRunnerCreateStrategyRepository', () => {
  let repository: DockerRunnerCreateStrategyRepository;
  let dockerCreateMyst: MockProxy<ICreateRunnerRepository>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    dockerCreateMyst = mock<ICreateRunnerRepository>({serviceType: RunnerServiceEnum.MYST});

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.DOCKER_RUNNER_CREATE_MYST_REPOSITORY,
          useValue: dockerCreateMyst,
        },
        {
          provide: DockerRunnerCreateStrategyRepository,
          inject: [ProviderTokenEnum.DOCKER_RUNNER_CREATE_MYST_REPOSITORY],
          useFactory: (...dockerCreateList: Array<ICreateRunnerRepository>) =>
            new DockerRunnerCreateStrategyRepository(dockerCreateList),
        },
      ],
    }).compile();

    repository = module.get<DockerRunnerCreateStrategyRepository>(DockerRunnerCreateStrategyRepository);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe(`Create container`, () => {
    describe(`Create container when not match instance`, () => {
      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            {
              provide: DockerRunnerCreateStrategyRepository,
              inject: [],
              useFactory: (...dockerCreateList: Array<ICreateRunnerRepository>) =>
                new DockerRunnerCreateStrategyRepository(dockerCreateList),
            },
          ],
        }).compile();

        repository = module.get<DockerRunnerCreateStrategyRepository>(DockerRunnerCreateStrategyRepository);
      });

      it(`Should error create container when not match any instance for create`, async () => {
        const inputRunner = defaultModelFactory<RunnerModel<MystIdentityModel>>(
          RunnerModel,
          {
            id: 'default-id',
            serial: 'default-serial',
            name: 'myst',
            service: RunnerServiceEnum.MYST,
            exec: RunnerExecEnum.DOCKER,
            socketType: RunnerSocketTypeEnum.HTTP,
            label: {
              $namespace: MystIdentityModel.name,
              id: identifierMock.generateId(),
              identity: 'identity-1',
              passphrase: 'passphrase-1',
            },
            volumes: [
              {
                source: '/path/of/identity-1',
                dest: '-',
                name: RunnerServiceVolumeEnum.MYST_KEYSTORE,
              },
            ],
            status: RunnerStatusEnum.CREATING,
            insertDate: new Date(),
          },
          ['id', 'serial', 'status', 'insertDate'],
        );

        const [error] = await repository.create(inputRunner);

        expect(dockerCreateMyst.create).toHaveBeenCalledTimes(0);
        expect(error).toBeInstanceOf(UnknownException);
      });
    });

    describe(`Create container when instance not valid`, () => {
      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            {
              provide: DockerRunnerCreateStrategyRepository,
              inject: [],
              useFactory: () =>
                new DockerRunnerCreateStrategyRepository(<Array<ICreateRunnerRepository>><any>'invalid-instance'),
            },
          ],
        }).compile();

        repository = module.get<DockerRunnerCreateStrategyRepository>(DockerRunnerCreateStrategyRepository);
      });

      it(`Should error create container when instance not valid`, async () => {
        const inputRunner = defaultModelFactory<RunnerModel<MystIdentityModel>>(
          RunnerModel,
          {
            id: 'default-id',
            serial: 'default-serial',
            name: 'myst',
            service: RunnerServiceEnum.MYST,
            exec: RunnerExecEnum.DOCKER,
            socketType: RunnerSocketTypeEnum.HTTP,
            label: {
              $namespace: MystIdentityModel.name,
              id: identifierMock.generateId(),
              identity: 'identity-1',
              passphrase: 'passphrase-1',
            },
            volumes: [
              {
                source: '/path/of/identity-1',
                dest: '-',
                name: RunnerServiceVolumeEnum.MYST_KEYSTORE,
              },
            ],
            status: RunnerStatusEnum.CREATING,
            insertDate: new Date(),
          },
          ['id', 'serial', 'status', 'insertDate'],
        );

        const [error] = await repository.create(inputRunner);

        expect(dockerCreateMyst.create).toHaveBeenCalledTimes(0);
        expect(error).toBeInstanceOf(RepositoryException);
      });
    });

    describe(`Create myst container`, () => {
      let inputRunner: RunnerModel<MystIdentityModel>;
      let outputRunner: RunnerModel<MystIdentityModel>;

      beforeEach(() => {
        inputRunner = defaultModelFactory<RunnerModel<MystIdentityModel>>(
          RunnerModel,
          {
            id: 'default-id',
            serial: 'default-serial',
            name: 'myst',
            service: RunnerServiceEnum.MYST,
            exec: RunnerExecEnum.DOCKER,
            socketType: RunnerSocketTypeEnum.HTTP,
            label: {
              $namespace: MystIdentityModel.name,
              id: identifierMock.generateId(),
              identity: 'identity-1',
              passphrase: 'passphrase-1',
            },
            volumes: [
              {
                source: '/path/of/identity-1',
                dest: '-',
                name: RunnerServiceVolumeEnum.MYST_KEYSTORE,
              },
            ],
            status: RunnerStatusEnum.CREATING,
            insertDate: new Date(),
          },
          ['id', 'serial', 'status', 'insertDate'],
        );

        outputRunner = new RunnerModel<MystIdentityModel>({
          id: identifierMock.generateId(),
          serial: 'serial',
          name: `${RunnerServiceEnum.MYST}1`,
          service: RunnerServiceEnum.MYST,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.NONE,
          status: RunnerStatusEnum.CREATING,
          insertDate: new Date(),
        });
      });

      it(`Should error create myst container`, async () => {
        dockerCreateMyst.create.mockResolvedValue([new UnknownException()]);

        const [error] = await repository.create(inputRunner);

        expect(dockerCreateMyst.create).toHaveBeenCalled();
        expect(error).toBeInstanceOf(UnknownException);
      });

      it(`Should error create myst container`, async () => {
        dockerCreateMyst.create.mockResolvedValue([null, outputRunner]);

        const [error, result] = await repository.create(inputRunner);

        expect(dockerCreateMyst.create).toHaveBeenCalled();
        expect(error).toBeNull();
        expect(result).toBeInstanceOf(RunnerModel);
      });
    });
  });
});
