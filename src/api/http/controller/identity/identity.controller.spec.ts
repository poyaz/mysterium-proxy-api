import {Test, TestingModule} from '@nestjs/testing';
import {IdentityController} from './identity.controller';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {IMystIdentityServiceInterface} from '@src-core/interface/i-myst-identity-service.interface';
import {IUsersServiceInterface} from '@src-core/interface/i-users-service.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';

describe('IdentityController', () => {
  let controller: IdentityController;
  let mystIdentityService: MockProxy<IMystIdentityServiceInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    mystIdentityService = mock<IMystIdentityServiceInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentityController],
      providers: [
        {
          provide: ProviderTokenEnum.MYST_IDENTITY_SERVICE,
          useValue: mystIdentityService,
        },
      ],
    }).compile();

    controller = module.get<IdentityController>(IdentityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
