import {Test, TestingModule} from '@nestjs/testing';
import {mock, MockProxy} from 'jest-mock-extended';
import {UsersHttpController} from './users.http.controller';
import {I_USER_SERVICE, IUsersService} from '../../../../core/interface/i-users-service.interface';

describe('UsersController', () => {
  let controller: UsersHttpController;
  let usersService: MockProxy<IUsersService>;

  beforeEach(async () => {
    usersService = mock<IUsersService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersHttpController],
      providers: [{
        provide: I_USER_SERVICE.DEFAULT,
        useValue: usersService,
      }],
    }).compile();

    controller = module.get<UsersHttpController>(UsersHttpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
