import {mock, MockProxy} from 'jest-mock-extended';
import {MystIdentityAggregateRepository} from './myst-identity-aggregate.repository';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {Test, TestingModule} from '@nestjs/testing';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {IAccountIdentityFileRepository} from '@src-core/interface/i-account-identity-file.repository';

describe('MystIdentityAggregateRepository', () => {
  let repository: MystIdentityAggregateRepository;
  let mystIdentityFileRepository: IAccountIdentityFileRepository;
  let mystIdentityPgRepository: IGenericRepositoryInterface<MystIdentityModel>;
  let dockerRunnerRepository: IRunnerRepositoryInterface;
  let identifierMock: MockProxy<IIdentifier>;
  let fakeIdentifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    mystIdentityFileRepository = mock<IAccountIdentityFileRepository>();
    mystIdentityPgRepository = mock<IGenericRepositoryInterface<MystIdentityModel>>();
    dockerRunnerRepository = mock<IRunnerRepositoryInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    fakeIdentifierMock = mock<IIdentifier>();
    fakeIdentifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.MYST_IDENTITY_FILE_REPOSITORY,
          useValue: mystIdentityFileRepository,
        },
        {
          provide: ProviderTokenEnum.MYST_IDENTITY_PG_REPOSITORY,
          useValue: mystIdentityPgRepository,
        },
        {
          provide: ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY,
          useValue: dockerRunnerRepository,
        },
        {
          provide: MystIdentityAggregateRepository,
          inject: [
            ProviderTokenEnum.MYST_IDENTITY_FILE_REPOSITORY,
            ProviderTokenEnum.MYST_IDENTITY_PG_REPOSITORY,
            ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY,
          ],
          useFactory: (
            mystIdentityFileRepository: IAccountIdentityFileRepository,
            mystIdentityPgRepository: IGenericRepositoryInterface<MystIdentityModel>,
            dockerRunnerRepository: IRunnerRepositoryInterface,
          ) =>
            new MystIdentityAggregateRepository(
              mystIdentityFileRepository,
              mystIdentityPgRepository,
              dockerRunnerRepository,
            ),
        },
      ],
    }).compile();

    repository = module.get<MystIdentityAggregateRepository>(MystIdentityAggregateRepository);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });
});
