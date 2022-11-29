import { Test, TestingModule } from '@nestjs/testing';
import { UsersFavoritesHttpController } from './users-favorites-http.controller';

describe('UsersFavoritesHttpController', () => {
  let controller: UsersFavoritesHttpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersFavoritesHttpController],
    }).compile();

    controller = module.get<UsersFavoritesHttpController>(UsersFavoritesHttpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
