import { Test, TestingModule } from '@nestjs/testing';
import { AclHttpController } from './acl-http.controller';

describe('AclHttpController', () => {
  let controller: AclHttpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AclHttpController],
    }).compile();

    controller = module.get<AclHttpController>(AclHttpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
