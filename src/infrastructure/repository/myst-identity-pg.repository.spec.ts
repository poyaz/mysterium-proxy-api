import {MystIdentityPgRepository} from './myst-identity-pg.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {Repository} from 'typeorm';
import {AccountIdentityEntity} from '@src-infrastructure/entity/account-identity.entity';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {IDateTime} from '@src-core/interface/i-date-time.interface';
import {Test, TestingModule} from '@nestjs/testing';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {getRepositoryToken} from '@nestjs/typeorm';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {FilterModel, SortEnum} from '@src-core/model/filter.model';
import {FindManyOptions} from 'typeorm/find-options/FindManyOptions';
import {RepositoryException} from '@src-core/exception/repository.exception';
import exp from 'constants';
import {DefaultModel} from '@src-core/model/defaultModel';

describe('MystIdentityPgRepository', () => {
  let repository: MystIdentityPgRepository;
  let accountIdentityDb: MockProxy<Repository<AccountIdentityEntity>>;
  let identifierMock: MockProxy<IIdentifier>;
  let fakeIdentifierMock: MockProxy<IIdentifier>;
  let dateTimeMock: MockProxy<IDateTime>;
  const defaultDate = new Date('2020-01-01');

  beforeEach(async () => {
    accountIdentityDb = mock<Repository<AccountIdentityEntity>>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    fakeIdentifierMock = mock<IIdentifier>();
    fakeIdentifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    dateTimeMock = mock<IDateTime>();
    dateTimeMock.gregorianCurrentDateWithTimezone.mockReturnValue(defaultDate);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.IDENTIFIER_UUID,
          useValue: identifierMock,
        },
        {
          provide: ProviderTokenEnum.DATE_TIME_DEFAULT,
          useValue: dateTimeMock,
        },
        {
          provide: getRepositoryToken(AccountIdentityEntity),
          useValue: accountIdentityDb,
        },
        {
          provide: MystIdentityPgRepository,
          inject: [getRepositoryToken(AccountIdentityEntity), ProviderTokenEnum.IDENTIFIER_UUID, ProviderTokenEnum.DATE_TIME_DEFAULT],
          useFactory: (db: Repository<AccountIdentityEntity>, identifier: IIdentifier, dateTime: IDateTime) =>
            new MystIdentityPgRepository(db, identifier, dateTime),
        },
      ],
    }).compile();

    repository = module.get<MystIdentityPgRepository>(MystIdentityPgRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe(`Get all myst identity`, () => {
    let outputAccountIdentityEntity1: AccountIdentityEntity;
    let inputIdentityFilterModel: FilterModel<MystIdentityModel>;
    let inputFilterSortModel: FilterModel<MystIdentityModel>;
    let inputFilterSkipPaginationModel: FilterModel<MystIdentityModel>;

    beforeEach(() => {
      outputAccountIdentityEntity1 = new AccountIdentityEntity();
      outputAccountIdentityEntity1.id = identifierMock.generateId();
      outputAccountIdentityEntity1.identity = 'identity1';
      outputAccountIdentityEntity1.passphrase = 'identity pass 1';
      outputAccountIdentityEntity1.path = '/store/path/identity1/';
      outputAccountIdentityEntity1.insertDate = defaultDate;
      outputAccountIdentityEntity1.updateDate = null;

      inputIdentityFilterModel = new FilterModel<MystIdentityModel>();
      inputIdentityFilterModel.addCondition({$opr: 'eq', identity: outputAccountIdentityEntity1.identity});

      inputFilterSortModel = new FilterModel<MystIdentityModel>({page: 3, limit: 1});
      inputFilterSortModel.addSortBy({insertDate: SortEnum.ASC});

      inputFilterSkipPaginationModel = new FilterModel<MystIdentityModel>({skipPagination: true});
    });

    it(`Should error get all identity (without filter)`, async () => {
      const executeError = new Error('Error in create on database');
      accountIdentityDb.findAndCount.mockRejectedValue(executeError);

      const [error] = await repository.getAll();

      expect(accountIdentityDb.findAndCount).toHaveBeenCalled();
      expect(accountIdentityDb.findAndCount).toBeCalledWith(expect.objectContaining(<FindManyOptions<AccountIdentityEntity>>{
        order: {insertDate: SortEnum.DESC},
      }));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(executeError);
    });

    it(`Should error get all identity (with filter)`, async () => {
      const executeError = new Error('Error in create on database');
      accountIdentityDb.findAndCount.mockRejectedValue(executeError);

      const [error] = await repository.getAll(inputIdentityFilterModel);

      expect(accountIdentityDb.findAndCount).toHaveBeenCalled();
      expect(accountIdentityDb.findAndCount).toBeCalledWith(expect.objectContaining(<FindManyOptions<AccountIdentityEntity>>{
        where: [{identity: inputIdentityFilterModel.getCondition('identity').identity}],
        order: {insertDate: SortEnum.DESC},
      }));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully get all identity (without filter) and return empty records`, async () => {
      accountIdentityDb.findAndCount.mockResolvedValue([[], 0]);

      const [error, result, count] = await repository.getAll();

      expect(accountIdentityDb.findAndCount).toHaveBeenCalled();
      expect(accountIdentityDb.findAndCount).toBeCalledWith(expect.objectContaining(<FindManyOptions<AccountIdentityEntity>>{
        order: {insertDate: SortEnum.DESC},
      }));
      expect(error).toBeNull();
      expect(result.length).toEqual(0);
      expect(count).toEqual(0);
    });

    it(`Should successfully get all identity (without filter) and return records`, async () => {
      accountIdentityDb.findAndCount.mockResolvedValue([[outputAccountIdentityEntity1], 1]);

      const [error, result, count] = await repository.getAll();

      expect(accountIdentityDb.findAndCount).toHaveBeenCalled();
      expect(accountIdentityDb.findAndCount).toBeCalledWith(expect.objectContaining(<FindManyOptions<AccountIdentityEntity>>{
        order: {insertDate: SortEnum.DESC},
      }));
      expect(error).toBeNull();
      expect(result.length).toEqual(1);
      expect(count).toEqual(1);
      expect(result[0]).toMatchObject<Omit<MystIdentityModel, 'clone' | 'filename' | 'isUse'>>({
        id: outputAccountIdentityEntity1.id,
        identity: outputAccountIdentityEntity1.identity,
        passphrase: outputAccountIdentityEntity1.passphrase,
        path: outputAccountIdentityEntity1.path,
        insertDate: defaultDate,
        updateDate: null,
      });
      expect(result[0]).toEqual(expect.objectContaining({
        isDefaultProperty: expect.anything(),
        getDefaultProperties: expect.anything(),
      }));
      expect((<DefaultModel<MystIdentityModel>><unknown>result[0]).getDefaultProperties()).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['filename', 'isUse']));
    });

    it(`Should successfully get all identity (with filter) and return records`, async () => {
      accountIdentityDb.findAndCount.mockResolvedValue([[outputAccountIdentityEntity1], 1]);

      const [error, result, count] = await repository.getAll(inputIdentityFilterModel);

      expect(accountIdentityDb.findAndCount).toHaveBeenCalled();
      expect(accountIdentityDb.findAndCount).toBeCalledWith(expect.objectContaining(<FindManyOptions<AccountIdentityEntity>>{
        where: [{identity: inputIdentityFilterModel.getCondition('identity').identity}],
        order: {insertDate: SortEnum.DESC},
      }));
      expect(error).toBeNull();
      expect(result.length).toEqual(1);
      expect(count).toEqual(1);
      expect(result[0]).toMatchObject<Omit<MystIdentityModel, 'clone' | 'filename' | 'isUse'>>({
        id: outputAccountIdentityEntity1.id,
        identity: outputAccountIdentityEntity1.identity,
        passphrase: outputAccountIdentityEntity1.passphrase,
        path: outputAccountIdentityEntity1.path,
        insertDate: defaultDate,
        updateDate: null,
      });
      expect(result[0]).toEqual(expect.objectContaining({
        isDefaultProperty: expect.anything(),
        getDefaultProperties: expect.anything(),
      }));
      expect((<DefaultModel<MystIdentityModel>><unknown>result[0]).getDefaultProperties()).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['filename', 'isUse']));
    });

    it(`Should successfully get all identity (with sort) and return records`, async () => {
      accountIdentityDb.findAndCount.mockResolvedValue([[outputAccountIdentityEntity1], 1]);

      const [error, result, count] = await repository.getAll(inputFilterSortModel);

      expect(accountIdentityDb.findAndCount).toHaveBeenCalled();
      expect(accountIdentityDb.findAndCount).toBeCalledWith(expect.objectContaining(<FindManyOptions<AccountIdentityEntity>>{
        order: {insertDate: SortEnum.ASC},
        skip: 2,
        take: 1,
      }));
      expect(error).toBeNull();
      expect(result.length).toEqual(1);
      expect(count).toEqual(1);
      expect(result[0]).toMatchObject<Omit<MystIdentityModel, 'clone' | 'filename' | 'isUse'>>({
        id: outputAccountIdentityEntity1.id,
        identity: outputAccountIdentityEntity1.identity,
        passphrase: outputAccountIdentityEntity1.passphrase,
        path: outputAccountIdentityEntity1.path,
        insertDate: defaultDate,
        updateDate: null,
      });
      expect(result[0]).toEqual(expect.objectContaining({
        isDefaultProperty: expect.anything(),
        getDefaultProperties: expect.anything(),
      }));
      expect((<DefaultModel<MystIdentityModel>><unknown>result[0]).getDefaultProperties()).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['filename', 'isUse']));
    });

    it(`Should successfully get all identity (with skip pagination) and return records`, async () => {
      accountIdentityDb.findAndCount.mockResolvedValue([[outputAccountIdentityEntity1], 1]);

      const [error, result, count] = await repository.getAll(inputFilterSkipPaginationModel);

      expect(accountIdentityDb.findAndCount).toHaveBeenCalled();
      expect(accountIdentityDb.findAndCount.mock.calls[0][0]).toStrictEqual(<FindManyOptions<AccountIdentityEntity>>{
        order: {insertDate: SortEnum.DESC},
      });
      expect(error).toBeNull();
      expect(result.length).toEqual(1);
      expect(count).toEqual(1);
      expect(result[0]).toMatchObject<Omit<MystIdentityModel, 'clone' | 'filename' | 'isUse'>>({
        id: outputAccountIdentityEntity1.id,
        identity: outputAccountIdentityEntity1.identity,
        passphrase: outputAccountIdentityEntity1.passphrase,
        path: outputAccountIdentityEntity1.path,
        insertDate: defaultDate,
        updateDate: null,
      });
      expect(result[0]).toEqual(expect.objectContaining({
        isDefaultProperty: expect.anything(),
        getDefaultProperties: expect.anything(),
      }));
      expect((<DefaultModel<MystIdentityModel>><unknown>result[0]).getDefaultProperties()).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['filename', 'isUse']));
    });
  });

  describe(`Get by id`, () => {
    let inputId: string;
    let outputAccountIdentityEntity: AccountIdentityEntity;

    beforeEach(() => {
      inputId = identifierMock.generateId();

      outputAccountIdentityEntity = new AccountIdentityEntity();
      outputAccountIdentityEntity.id = identifierMock.generateId();
      outputAccountIdentityEntity.identity = 'identity1';
      outputAccountIdentityEntity.passphrase = 'identity pass 1';
      outputAccountIdentityEntity.path = '/store/path/identity1/';
      outputAccountIdentityEntity.insertDate = defaultDate;
      outputAccountIdentityEntity.updateDate = null;
    });

    it(`Should error get identity by id`, async () => {
      const executeError = new Error('Error in create on database');
      accountIdentityDb.findOneBy.mockRejectedValue(executeError);

      const [error] = await repository.getById(inputId);

      expect(accountIdentityDb.findOneBy).toHaveBeenCalled();
      expect(accountIdentityDb.findOneBy).toBeCalledWith({id: inputId});
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully get identity by id but can't find and return null`, async () => {
      accountIdentityDb.findOneBy.mockResolvedValue(null);

      const [error, result] = await repository.getById(inputId);

      expect(accountIdentityDb.findOneBy).toHaveBeenCalled();
      expect(accountIdentityDb.findOneBy).toBeCalledWith({id: inputId});
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should successfully get identity by id`, async () => {
      accountIdentityDb.findOneBy.mockResolvedValue(outputAccountIdentityEntity);

      const [error, result] = await repository.getById(inputId);

      expect(accountIdentityDb.findOneBy).toHaveBeenCalled();
      expect(accountIdentityDb.findOneBy).toBeCalledWith({id: inputId});
      expect(error).toBeNull();
      expect(result).toMatchObject<Omit<MystIdentityModel, 'clone' | 'filename' | 'isUse'>>({
        id: outputAccountIdentityEntity.id,
        identity: outputAccountIdentityEntity.identity,
        passphrase: outputAccountIdentityEntity.passphrase,
        path: outputAccountIdentityEntity.path,
        insertDate: defaultDate,
        updateDate: null,
      });
      expect(result).toEqual(expect.objectContaining({
        isDefaultProperty: expect.anything(),
        getDefaultProperties: expect.anything(),
      }));
      expect((<DefaultModel<MystIdentityModel>><unknown>result).getDefaultProperties()).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['filename', 'isUse']));
    });
  });

  describe(`Create identity`, () => {
    let inputIdentityModel: MystIdentityModel;
    let outputAccountIdentityEntity: AccountIdentityEntity;

    beforeEach(() => {
      inputIdentityModel = new MystIdentityModel({
        id: fakeIdentifierMock.generateId(),
        identity: 'identity1',
        passphrase: 'identity pass 1',
        path: '/store/path/identity1/',
        filename: 'identity1.json',
        isUse: false,
        insertDate: new Date(),
      });

      outputAccountIdentityEntity = new AccountIdentityEntity();
      outputAccountIdentityEntity.id = identifierMock.generateId();
      outputAccountIdentityEntity.identity = inputIdentityModel.identity;
      outputAccountIdentityEntity.passphrase = inputIdentityModel.passphrase;
      outputAccountIdentityEntity.path = inputIdentityModel.path;
      outputAccountIdentityEntity.insertDate = defaultDate;
      outputAccountIdentityEntity.updateDate = null;
    });

    it(`Should error create identity`, async () => {
      const executeError = new Error('Error in create on database');
      accountIdentityDb.save.mockRejectedValue(executeError);

      const [error] = await repository.add(inputIdentityModel);

      expect(identifierMock.generateId).toHaveBeenCalled();
      expect(dateTimeMock.gregorianCurrentDateWithTimezone).toHaveBeenCalled();
      expect(accountIdentityDb.save).toHaveBeenCalled();
      expect(accountIdentityDb.save).toBeCalledWith(<AccountIdentityEntity>{
        id: identifierMock.generateId(),
        identity: inputIdentityModel.identity,
        passphrase: inputIdentityModel.passphrase,
        path: inputIdentityModel.path,
        insertDate: defaultDate,
      }, {transaction: false});
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully create identity`, async () => {
      accountIdentityDb.save.mockResolvedValue(outputAccountIdentityEntity);

      const [error, result] = await repository.add(inputIdentityModel);

      expect(identifierMock.generateId).toHaveBeenCalled();
      expect(dateTimeMock.gregorianCurrentDateWithTimezone).toHaveBeenCalled();
      expect(accountIdentityDb.save).toHaveBeenCalled();
      expect(accountIdentityDb.save).toBeCalledWith(<AccountIdentityEntity>{
        id: identifierMock.generateId(),
        identity: inputIdentityModel.identity,
        passphrase: inputIdentityModel.passphrase,
        path: inputIdentityModel.path,
        insertDate: defaultDate,
      }, {transaction: false});
      expect(error).toBeNull();
      expect(result).toMatchObject<Omit<MystIdentityModel, 'clone' | 'filename' | 'isUse'>>({
        id: outputAccountIdentityEntity.id,
        identity: outputAccountIdentityEntity.identity,
        passphrase: outputAccountIdentityEntity.passphrase,
        path: outputAccountIdentityEntity.path,
        insertDate: defaultDate,
        updateDate: null,
      });
      expect(result).toEqual(expect.objectContaining({
        isDefaultProperty: expect.anything(),
        getDefaultProperties: expect.anything(),
      }));
      expect((<DefaultModel<MystIdentityModel>><unknown>result).getDefaultProperties()).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['filename', 'isUse']));
    });
  });
});
