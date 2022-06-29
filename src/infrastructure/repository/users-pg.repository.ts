import {Injectable} from '@nestjs/common';
import {IGenericRepositoryInterface} from '../../core/interface/i-generic-repository.interface';
import {UsersModel} from '../../core/model/users.model';
import {AsyncReturn} from '../../core/utility';
import {UsersEntity} from '../entity/users.entity';
import {Repository} from 'typeorm';
import {instanceToPlain, plainToInstance} from 'class-transformer';
import {IIdentifier} from '../../core/interface/i-identifier.interface';
import {IDateTime} from '../../core/interface/i-date-time.interface';
import {RepositoryException} from '../../core/exception/repository.exception';
import {FindManyOptions} from 'typeorm/find-options/FindManyOptions';
import {FilterModel} from '../../core/model/filter.model';
import {UpdateModel} from '../../core/model/update.model';

@Injectable()
export class UsersPgRepository implements IGenericRepositoryInterface<UsersModel> {
  constructor(
    private readonly _db: Repository<UsersEntity>,
    private readonly _identifier: IIdentifier,
    private readonly _date: IDateTime,
  ) {
  }

  async add(model: UsersModel): Promise<AsyncReturn<Error, UsersModel>> {
    const data = instanceToPlain(model, {excludePrefixes: ['id', 'insertDate', 'updateDate', 'deleteDate']});
    const entity = plainToInstance(UsersEntity, data);
    entity.id = this._identifier.generateId();
    entity.insertDate = this._date.gregorianCurrentDateWithTimezone();

    try {
      const row = await this._db.save(entity, {transaction: false});
      const result = UsersPgRepository._fillModel(row);

      return [null, result];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async getAll<F>(filter?: F): Promise<AsyncReturn<Error, Array<UsersModel>>> {
    const findOptions: FindManyOptions = {};
    if (filter) {
      const filterModel = <FilterModel<UsersModel>><any>filter;
      if (filterModel.getLengthOfCondition() > 0) {
        findOptions.where = [];

        const getUsername = filterModel.getCondition('username');
        if (getUsername) {
          findOptions.where.push(getUsername);
        }

        const getIsEnable = filterModel.getCondition('isEnable');
        if (getIsEnable) {
          findOptions.where.push(getIsEnable);
        }
      }
    }

    try {
      const rows = await this._db.find(findOptions);
      const result = rows.map((v) => UsersPgRepository._fillModel(v));

      return [null, result];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async getById(id: string): Promise<AsyncReturn<Error, UsersModel | null>> {
    try {
      const row = await this._db.findOneBy({id});
      if (!row) {
        return [null, null];
      }

      const result = UsersPgRepository._fillModel(row);

      return [null, result];
    } catch (error) {
      return [new RepositoryException(error)];
    }
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

  async update<F>(model: F): Promise<AsyncReturn<Error, null>> {
    const updateModel = <UpdateModel<UsersModel>><any>model;
    const updateUserModel = <UsersModel>updateModel;

    try {
      const row = await this._db.findOneBy({id: updateModel.id});
      if (!row) {
        return [null];
      }

      if (typeof updateUserModel.password !== 'undefined') {
        row.password = updateUserModel.password;
      }
      if (typeof updateUserModel.isEnable !== 'undefined') {
        row.isEnable = updateUserModel.isEnable;
      }

      await row.save({transaction: false});

      return [null];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  private static _fillModel(entity) {
    const data = instanceToPlain(entity, {});
    return plainToInstance(UsersModel, data);
  }
}
