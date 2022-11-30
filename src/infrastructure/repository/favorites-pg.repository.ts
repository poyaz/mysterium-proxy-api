import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {AsyncReturn} from '@src-core/utility';
import {Repository} from 'typeorm';
import {FavoritesEntity} from '@src-infrastructure/entity/favorites.entity';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {IDateTime} from '@src-core/interface/i-date-time.interface';
import {FindManyOptions} from 'typeorm/find-options/FindManyOptions';
import {FavoritesListTypeEnum, FavoritesModel} from '@src-core/model/favorites.model';
import {FilterModel, SortEnum} from '@src-core/model/filter.model';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {defaultModelFactory, defaultModelType} from '@src-core/model/defaultModel';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {UsersEntity} from '@src-infrastructure/entity/users.entity';
import {UpdateModel} from '@src-core/model/update.model';

export class FavoritesPgRepository implements IGenericRepositoryInterface<FavoritesModel> {
  constructor(
    private readonly _db: Repository<FavoritesEntity>,
    private readonly _identifier: IIdentifier,
    private readonly _date: IDateTime,
  ) {
  }

  async getAll<F>(filter?: F): Promise<AsyncReturn<Error, Array<FavoritesModel>>> {
    const findOptions: FindManyOptions<FavoritesEntity> = {order: {insertDate: SortEnum.DESC}};

    if (filter) {
      const filterModel = <FilterModel<FavoritesModel>><unknown>filter;

      if (filterModel.getLengthOfCondition() > 0) {
        findOptions.where = [];

        const getUserProxy = filterModel.getCondition('usersProxy');
        if (getUserProxy) {
          const userProxyModelFilter = <defaultModelType<UsersProxyModel>><unknown>getUserProxy.usersProxy;

          if (
            !userProxyModelFilter.IS_DEFAULT_MODEL
            || (userProxyModelFilter.IS_DEFAULT_MODEL && !userProxyModelFilter.isDefaultProperty('user'))
          ) {
            const userId = userProxyModelFilter.user.id;

            findOptions.where.push({user: {id: userId}});
          }
        }

        const getKind = filterModel.getCondition('kind');
        if (getKind) {
          findOptions.where.push({kind: <any>getKind.kind});
        }
      }

      if (!filterModel.skipPagination) {
        findOptions.skip = filterModel.page - 1;
        findOptions.take = filterModel.limit;
      }
    }

    try {
      const [rows, count] = await this._db.findAndCount(findOptions);
      const result = rows.map((v) => FavoritesPgRepository._fillModel(v));

      return [null, result, count];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async getById(id: string): Promise<AsyncReturn<Error, FavoritesModel | null>> {
    try {
      const row = await this._db.findOneBy({id});
      if (!row) {
        return [null, null];
      }

      const result = FavoritesPgRepository._fillModel(row);

      return [null, result];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async add(model: FavoritesModel): Promise<AsyncReturn<Error, FavoritesModel>> {
    return [new UnknownException()];
  }

  async addBulk(models: Array<FavoritesModel>): Promise<AsyncReturn<Error, Array<FavoritesModel>>> {
    const entities = models.map((v) => {
      const entity = new FavoritesEntity();
      entity.id = this._identifier.generateId();
      entity.user = new UsersEntity();
      entity.user.id = v.usersProxy.user.id;
      entity.kind = <any>v.kind;
      entity.proxyId = v.usersProxy.id;
      entity.note = v.note;
      entity.insertDate = this._date.gregorianCurrentDateWithTimezone();

      return entity;
    });

    try {
      const rows = await this._db.save(entities, {transaction: false});
      const result = rows.map((v) => FavoritesPgRepository._fillModel(v));

      return [null, result, result.length];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async update<F>(model: F): Promise<AsyncReturn<Error, null>> {
    const updateModel = <UpdateModel<FavoritesModel>><unknown>model;
    const updateFavoriteModel = <FavoritesModel>updateModel.getModel();

    try {
      const row = await this._db.findOneBy({id: updateModel.id});
      if (!row) {
        return [null, null];
      }

      if (typeof updateFavoriteModel.kind !== 'undefined') {
        row.kind = <any>updateFavoriteModel.kind;
      }
      if (typeof updateFavoriteModel.note !== 'undefined') {
        row.note = updateFavoriteModel.note;
      }

      await row.save({transaction: false});

      return [null, null];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async updateBulk<F>(models: Array<F>): Promise<AsyncReturn<Error, null>> {
    const updateModels = <Array<UpdateModel<FavoritesModel>>><unknown>models;

    const updateIdList = [];
    const updateKindList = updateModels.map<FavoritesListTypeEnum>((v) => {
      updateIdList.push(v.id);

      return v.getModel().kind;
    });

    if ([...new Set(updateKindList)].length > 1) {
      return [new UnknownException()];
    }

    const updateKindField = <any>updateKindList[0];
    const updateUniqueIdList = [...new Set(updateIdList)];

    try {
      await this._db.createQueryBuilder()
        .update(FavoritesEntity)
        .set({kind: updateKindField})
        .whereInIds(updateUniqueIdList)
        .execute();

      return [null, null];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async remove(id: string): Promise<AsyncReturn<Error, null>> {
    return [new UnknownException()];
  }

  removeBulk(idList: Array<string>): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  private static _fillModel(entity: FavoritesEntity) {
    return new FavoritesModel({
      id: entity.id,
      kind: entity.kind,
      usersProxy: defaultModelFactory<UsersProxyModel>(
        UsersProxyModel,
        {
          id: entity.proxyId,
          listenAddr: 'default-listen-addr',
          listenPort: 0,
          proxyDownstream: [],
          user: {
            id: entity.user.id,
            username: entity.user.username,
            password: entity.user.password,
          },
          insertDate: new Date(),
        },
        ['listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
      ),
      note: entity.note,
      insertDate: entity.insertDate,
      updateDate: entity.updateDate,
    });
  }
}
