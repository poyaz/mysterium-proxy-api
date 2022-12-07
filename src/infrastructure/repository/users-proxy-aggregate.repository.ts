import {IUsersProxyRepositoryInterface} from '@src-core/interface/i-users-proxy-repository.interface';
import {AsyncReturn} from '@src-core/utility';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';
import {IProxyRepositoryInterface} from '@src-core/interface/i-proxy-repository.interface';
import {IProxyAclRepositoryInterface} from '@src-core/interface/i-proxy-acl-repository.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {ProxyAclMode, ProxyAclModel} from '@src-core/model/proxyAclModel';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {UsersModel} from '@src-core/model/users.model';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {filterAndSortUsersProxy} from '@src-infrastructure/utility/filterAndSortUsersProxy';

export class UsersProxyAggregateRepository implements IUsersProxyRepositoryInterface {
  constructor(
    private readonly _proxyRepository: IProxyRepositoryInterface,
    private readonly _proxyAclRepository: IProxyAclRepositoryInterface,
    private readonly _usersRepository: IGenericRepositoryInterface<UsersModel>,
  ) {
  }

  async getByUserId(userId: string, filter?: FilterModel<UsersProxyModel>): Promise<AsyncReturn<Error, Array<UsersProxyModel>>> {
    const dataFilter: FilterModel<UsersProxyModel> = !filter ? new FilterModel<UsersProxyModel>() : filter;

    const proxyAclFilter = new FilterModel<ProxyAclModel>({skipPagination: true});
    proxyAclFilter.addCondition({
      $opr: 'eq',
      user: defaultModelFactory<UsersModel>(
        UsersModel,
        {
          id: userId,
          username: 'default-username',
          password: 'default-password',
          insertDate: new Date(),
        },
        ['username', 'password', 'insertDate'],
      ),
    });

    const [
      [userError, userData],
      [proxyAclError, proxyAclList, proxyAclTotal],
      [proxyError, proxyList, proxyTotal],
    ] = await Promise.all([
      this._usersRepository.getById(userId),
      this._proxyAclRepository.getAll(proxyAclFilter),
      this._proxyRepository.getAll(),
    ]);
    const error = proxyAclError || proxyError || userError;
    if (error) {
      return [error];
    }
    if (proxyAclTotal === 0) {
      return [null, [], 0];
    }
    if (!userData) {
      return [null, [], 0];
    }

    let userProxyList: Array<UsersProxyModel>;

    const findAccessToAllProxy = proxyAclList.find((v) => v.mode === ProxyAclMode.ALL);
    if (findAccessToAllProxy) {
      userProxyList = proxyList.map((v) => UsersProxyAggregateRepository._fillProxyAllAccessModel(v, userData));
    } else {
      userProxyList = proxyAclList.map((v) => UsersProxyAggregateRepository._fillProxyPortAccessModel(v, proxyList)).flat();
    }

    const [result, totalCount] = filterAndSortUsersProxy(userProxyList, dataFilter);

    return [null, result, totalCount];
  }

  private static _fillProxyAllAccessModel(proxy: ProxyUpstreamModel, user: UsersModel): UsersProxyModel {
    return new UsersProxyModel({
      id: proxy.id,
      listenAddr: proxy.listenAddr,
      listenPort: proxy.listenPort,
      proxyDownstream: proxy.proxyDownstream,
      insertDate: proxy.insertDate,
      user: {
        id: user.id,
        username: user.username,
        password: user.password,
      },
      runner: proxy.runner,
    });
  }

  private static _fillProxyPortAccessModel(proxyAcl: ProxyAclModel, proxiesList: Array<ProxyUpstreamModel>): Array<UsersProxyModel> {
    return proxyAcl.proxies
      .map((proxyAclUpstream) => {
        const find = proxiesList.find((v) => v.listenPort === proxyAclUpstream.listenPort);
        if (!find) {
          return;
        }

        return new UsersProxyModel({
          id: find.id,
          listenAddr: find.listenAddr,
          listenPort: find.listenPort,
          proxyDownstream: find.proxyDownstream,
          insertDate: find.insertDate,
          user: {
            id: proxyAcl.user.id,
            username: proxyAcl.user.username,
            password: proxyAcl.user.password,
          },
          runner: find.runner,
        });
      })
      .filter((v) => v);
  }
}
