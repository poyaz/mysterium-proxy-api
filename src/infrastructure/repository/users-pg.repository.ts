import {Inject, Injectable} from '@nestjs/common';
import {IGenericRepositoryInterface} from '../../core/interface/i-generic-repository.interface';
import {UsersModel} from '../../core/model/users.model';
import {AsyncReturn} from '../../core/utility';
import {UsersEntity} from '../entity/users.entity';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {instanceToPlain, plainToInstance} from 'class-transformer';
import {I_IDENTIFIER, IIdentifier} from '../../core/interface/i-identifier.interface';
import {I_DATE_TIME, IDateTime} from '../../core/interface/i-date-time.interface';
import {RepositoryException} from '../../core/exception/repository.exception';
import {FindManyOptions} from 'typeorm/find-options/FindManyOptions';
import {FilterModel} from '../../core/model/filter.model';

@Injectable()
export class UsersPgRepository implements IGenericRepositoryInterface<UsersModel> {
  constructor(
    @InjectRepository(UsersEntity)
    private readonly _db: Repository<UsersEntity>,
    @Inject(I_IDENTIFIER.DEFAULT)
    private readonly _identifier: IIdentifier,
    @Inject(I_DATE_TIME.DEFAULT)
    private readonly _date: IDateTime,
  ) {
  }

  async add(model: UsersModel): Promise<AsyncReturn<Error, UsersModel>> {
    const data = instanceToPlain(model, {excludePrefixes: ['id', 'insertDate', 'updateDate', 'deleteDate']});
    const entity = plainToInstance(UsersEntity, data);
    entity.id = this._identifier.generateId();
    entity.insertDate = this._date.gregorianCurrentDateWithTimezone();

    try {
      const row = await this._db.create(entity);
      const result = UsersPgRepository._fillModel(row);

      return [null, result];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async getAll<F>(filter?: F): Promise<AsyncReturn<Error, Array<UsersModel>>> {
    const findOptions: FindManyOptions = {};
    if (filter) {
      findOptions.where = (filter as unknown as FilterModel).map((v) => ({[v.name]: v.value}));
    }

    try {
      const rows = await this._db.find(findOptions);
      const result = rows.map((v) => UsersPgRepository._fillModel(v));

      return [null, result];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  getById(id: string): Promise<AsyncReturn<Error, UsersModel | null>> {
    return Promise.resolve(undefined);
  }

  remove(id: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  update<F>(model: F): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  private static _fillModel(entity) {
    const data = instanceToPlain(entity, {});
    return plainToInstance(UsersModel, data);
  }
}
