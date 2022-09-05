import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {AsyncReturn} from '@src-core/utility';
import {Repository} from 'typeorm';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {IDateTime} from '@src-core/interface/i-date-time.interface';
import {AccountIdentityEntity} from '@src-infrastructure/entity/account-identity.entity';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {FindManyOptions} from 'typeorm/find-options/FindManyOptions';
import {FilterModel, SortEnum} from '@src-core/model/filter.model';
import {instanceToPlain, plainToInstance} from 'class-transformer';
import {defaultModelFactory} from '@src-core/model/defaultModel';

export class MystIdentityPgRepository implements IGenericRepositoryInterface<MystIdentityModel> {
  constructor(
    private readonly _db: Repository<AccountIdentityEntity>,
    private readonly _identifier: IIdentifier,
    private readonly _date: IDateTime,
  ) {
  }

  async getAll<F>(filter?: F): Promise<AsyncReturn<Error, Array<MystIdentityModel>>> {
    const findOptions: FindManyOptions<AccountIdentityEntity> = {order: {insertDate: SortEnum.DESC}};

    if (filter) {
      const filterModel = <FilterModel<MystIdentityModel>><any>filter;

      if (filterModel.getLengthOfCondition() > 0) {
        findOptions.where = [];

        const getIdentity = filterModel.getCondition('identity');
        if (getIdentity) {
          findOptions.where.push({identity: getIdentity.identity});
        }
      }

      if (filterModel.getLengthOfSortBy() > 0) {
        findOptions.order = {};

        const getInsertDateSort = filterModel.getSortBy('insertDate');
        if (getInsertDateSort) {
          findOptions.order.insertDate = getInsertDateSort;
        }
      }

      if (!filterModel.skipPagination) {
        findOptions.skip = filterModel.page - 1;
        findOptions.take = filterModel.limit;
      }
    }

    try {
      const [rows, count] = await this._db.findAndCount(findOptions);
      const result = rows.map((v) => MystIdentityPgRepository._fillModel(v));

      return [null, result, count];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async getById(id: string): Promise<AsyncReturn<Error, MystIdentityModel | null>> {
    try {
      const row = await this._db.findOneBy({id});
      if (!row) {
        return [null, null];
      }

      const result = MystIdentityPgRepository._fillModel(row);

      return [null, result];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async add(model: MystIdentityModel): Promise<AsyncReturn<Error, MystIdentityModel>> {
    const data = instanceToPlain(model, {excludePrefixes: ['id', 'insertDate', 'updateDate', 'deleteDate', 'isUse', 'filename']});
    data.identity = model.identity;

    const entity = plainToInstance(AccountIdentityEntity, data);

    entity.id = this._identifier.generateId();
    entity.insertDate = this._date.gregorianCurrentDateWithTimezone();

    try {
      const row = await this._db.save(entity, {transaction: false});
      const result = MystIdentityPgRepository._fillModel(row);

      return [null, result];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async update<F>(model: F): Promise<AsyncReturn<Error, null>> {
    return [null, null];
  }

  async remove(id: string): Promise<AsyncReturn<Error, null>> {
    try {
      const row = await this._db.findOneBy({id});
      if (!row) {
        return [null];
      }

      await row.softRemove({transaction: false});

      return [null];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  private static _fillModel(entity) {
    const modelValue = new MystIdentityModel({
      id: entity.id,
      identity: entity.identity,
      passphrase: entity.passphrase,
      path: entity.path,
      filename: '',
      isUse: false,
      insertDate: entity.insertDate,
      updateDate: entity.updateDate,
    });

    return defaultModelFactory<MystIdentityModel>(MystIdentityModel, modelValue, ['filename', 'isUse']);
  }
}
