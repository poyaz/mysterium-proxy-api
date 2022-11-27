import {IProxyAclRepositoryInterface} from '@src-core/interface/i-proxy-acl-repository.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {ProxyAclMode, ProxyAclModel} from '@src-core/model/proxyAclModel';
import {AsyncReturn} from '@src-core/utility';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {UsersModel} from '@src-core/model/users.model';
import {defaultModelType} from '@src-core/model/defaultModel';
import {filterAndSortProxyAcl} from '@src-infrastructure/utility/filterAndSortProxyAcl';

type CombineUsersAndProxies = {
  usersList,
  userCount,
  proxiesList,
  proxyCount,
}

type UserMapPos = {
  [key: string]: number,
}

type PromiseGetAll = [
  AsyncReturn<Error, Array<ProxyAclModel>>,
    AsyncReturn<Error, UsersModel | null> | AsyncReturn<Error, Array<UsersModel>>,
]

export class NginxProxyAclAggregateRepository implements IProxyAclRepositoryInterface {
  constructor(
    private readonly _proxyAclRepository: IProxyAclRepositoryInterface,
    private readonly _usersRepository: IGenericRepositoryInterface<UsersModel>,
  ) {
  }

  async getAll(filter?: FilterModel<ProxyAclModel>): Promise<AsyncReturn<Error, Array<ProxyAclModel>>> {
    const filterModel = filter ? filter : new FilterModel<ProxyAclModel>({skipPagination: true});

    const [combineError, combineData] = await this._getAllCombine(filterModel);
    if (combineError) {
      return [combineError];
    }
    if (combineData.proxyCount === 0) {
      return [null, [], 0];
    }

    const userMap = NginxProxyAclAggregateRepository._userMapObject(combineData.usersList);
    const proxiesCombineList = combineData.proxiesList.map((v) => NginxProxyAclAggregateRepository._mergeData(v, combineData.usersList, userMap));

    const [result, totalCount] = filterAndSortProxyAcl(proxiesCombineList, filterModel);

    return [null, result, totalCount];
  }

  async create(model: ProxyAclModel): Promise<AsyncReturn<Error, ProxyAclModel>> {
    return this._proxyAclRepository.create(model);
  }

  async remove(id: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  private async _getAllCombine(filter: FilterModel<ProxyAclModel>): Promise<AsyncReturn<Error, CombineUsersAndProxies>> {
    const tasks = [];

    tasks.push(this._proxyAclRepository.getAll(filter));

    const getUser = filter.getCondition('user');
    let isGetUserById = false;

    if (getUser) {
      const userModelFilter = <defaultModelType<UsersModel>><unknown>getUser.user;
      if (
        !userModelFilter.IS_DEFAULT_MODEL
        || (userModelFilter.IS_DEFAULT_MODEL && !userModelFilter.isDefaultProperty('id'))
      ) {
        isGetUserById = true;
        tasks.push(this._usersRepository.getById(getUser.user.id));
      }
    }

    if (!isGetUserById) {
      tasks.push(this._usersRepository.getAll<FilterModel<UsersModel>>(new FilterModel<UsersModel>({skipPagination: true})));
    }

    const [
      [proxyAclError, proxiesAclList, proxyAclTotal],
      [usersError, ...usersData],
    ]: PromiseGetAll = <any>await Promise.all(tasks);

    const error = proxyAclError || usersError;
    if (error) {
      return [error];
    }

    if (isGetUserById) {
      if (!usersData[0]) {
        return [null, {proxiesList: [], proxyCount: 0, usersList: [], userCount: 0}];
      }

      return [null, {proxiesList: proxiesAclList, proxyCount: proxyAclTotal, usersList: [usersData[0]], userCount: 1}];
    }

    const [userList, userTotal] = usersData;
    return [null, {proxiesList: proxiesAclList, proxyCount: proxyAclTotal, usersList: userList, userCount: userTotal}];
  }

  private static _userMapObject(usersList: Array<UsersModel>): UserMapPos {
    const obj: UserMapPos = {};

    for (let i = 0; i < usersList.length; i++) {
      const user = usersList[i];

      obj[user.id] = i;
    }

    return obj;
  }

  private static _mergeData(proxyData: ProxyAclModel, usersList: Array<UsersModel>, userMap: UserMapPos): ProxyAclModel {
    if (proxyData.mode === ProxyAclMode.ALL && !proxyData.user) {
      return proxyData;
    }

    const userDataIndex = userMap[proxyData.user.id];
    if (typeof userDataIndex === 'undefined') {
      return proxyData;
    }

    proxyData.user = usersList[userDataIndex];

    return proxyData;
  }
}
