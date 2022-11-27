import {IProxyAclRepositoryInterface} from '@src-core/interface/i-proxy-acl-repository.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {ProxyAclMode, ProxyAclModel} from '@src-core/model/proxyAclModel';
import {AsyncReturn} from '@src-core/utility';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {UsersModel} from '@src-core/model/users.model';
import {defaultModelType} from '@src-core/model/defaultModel';
import {filterAndSortProxyAcl} from '@src-infrastructure/utility/filterAndSortProxyAcl';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {RunnerModel, RunnerServiceEnum} from '@src-core/model/runner.model';

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
    private readonly _runnerRepository: IRunnerRepositoryInterface,
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
    const [runnerError, runnerId] = await this._getRunner();
    if (runnerError) {
      return [runnerError];
    }

    const [createError, createData] = await this._proxyAclRepository.create(model);
    if (createError) {
      return [createError];
    }

    if (runnerId) {
      await this._runnerRepository.reload(runnerId);
    }

    return [null, createData];
  }

  async remove(id: string): Promise<AsyncReturn<Error, null>> {
    const [runnerError, runnerId] = await this._getRunner();
    if (runnerError) {
      return [runnerError];
    }

    const [removeError, removeData] = await this._proxyAclRepository.remove(id);
    if (removeError) {
      return [removeError];
    }

    if (runnerId) {
      await this._runnerRepository.reload(runnerId);
    }

    return [null, removeData];
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

  private async _getRunner(): Promise<AsyncReturn<Error, string | null>> {
    const runnerFilter = new FilterModel<RunnerModel>();
    runnerFilter.addCondition({$opr: 'eq', service: RunnerServiceEnum.NGINX});

    const [runnerError, runnerList] = await this._runnerRepository.getAll(runnerFilter);
    if (runnerError) {
      return [runnerError];
    }

    if (runnerList.length !== 1) {
      return [null, null];
    }

    return [null, runnerList[0].id];
  }
}
