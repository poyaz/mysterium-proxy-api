import {Test, TestingModule} from '@nestjs/testing';

import {NullUuidIdentifier} from './null-uuid-identifier';

describe('UuidIdentifierGenerator', () => {
  let repository: NullUuidIdentifier;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NullUuidIdentifier],
    }).compile();

    repository = module.get<NullUuidIdentifier>(NullUuidIdentifier);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should successful return string uuid', () => {
    const result = repository.generateId();

    expect(result).toEqual('00000000-0000-0000-0000-000000000000');
  });
});
