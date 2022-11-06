import { Test, TestingModule } from '@nestjs/testing';
import { ProxyHttpController } from './proxy.http.controller';

describe('Proxy.HttpController', () => {
  let controller: ProxyHttpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyHttpController],
    }).compile();

    controller = module.get<ProxyHttpController>(ProxyHttpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
