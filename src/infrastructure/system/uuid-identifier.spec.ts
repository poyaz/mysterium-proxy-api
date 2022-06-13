import {Test, TestingModule} from '@nestjs/testing';

import * as uuid from 'uuid';

jest.mock('uuid', () => ({
  v4: () => '00000000-0000-0000-0000-000000000000',
}));

import {UuidIdentifier} from './uuid-identifier';

describe('UuidIdentifierGenerator', () => {
  let repository: UuidIdentifier;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UuidIdentifier],
    }).compile();

    repository = module.get<UuidIdentifier>(UuidIdentifier);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should successful return string uuid', () => {
    const result = repository.generateId();

    expect(result).toEqual('00000000-0000-0000-0000-000000000000');
  });
});
