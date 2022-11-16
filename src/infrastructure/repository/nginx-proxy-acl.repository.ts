import {ProxyAclMode, ProxyAclModel, ProxyAclType} from '@src-core/model/proxyAclModel';
import {AsyncReturn} from '@src-core/utility';
import {FilterModel} from '@src-core/model/filter.model';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {IProxyAclRepositoryInterface} from '@src-core/interface/i-proxy-acl-repository.interface';
import * as fsAsync from 'fs/promises';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {InvalidAclFileException} from '@src-core/exception/invalid-acl-file.exception';
import {defaultModelFactory, defaultModelType} from '@src-core/model/defaultModel';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import {ProxyDownstreamModel, ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {UsersModel} from '@src-core/model/users.model';

type FetchReturn = { next: boolean, capture: boolean };

type ConditionFilter = { userId?: string };

enum AclRowType {
  REGEX = 'regex',
  MATCH = 'match',
}

type AclRowData = { id: string, userId: string, date: string, row: string };

type UserIdAclData = { id: string, rowType: AclRowType, isAccessToAllPort: boolean, portList?: Array<number>, insertDate: Date };

type AclObj = {
  isAll: boolean,
  allObj?: {
    id: string,
    date: Date,
  },
  userObj: {
    [userId: string]: Array<UserIdAclData>,
  },
}

export class NginxProxyAclRepository implements IProxyAclRepositoryInterface {
  private static _ALL_USERS_KEY = '-';

  constructor(private readonly _identifier: IIdentifier, private readonly _aclFile: string) {
  }

  async getAll(filter?: FilterModel<ProxyAclModel>): Promise<AsyncReturn<Error, Array<ProxyAclModel>>> {
    const dataFilter: FilterModel<ProxyAclModel> = !filter ? new FilterModel<ProxyAclModel>() : <any>filter;
    const conditionFilter: ConditionFilter = {};

    const getUser = dataFilter.getCondition('user');
    if (getUser) {
      const userModelFilter = <defaultModelType<UsersModel>><unknown>getUser.user;

      if (
        !userModelFilter.IS_DEFAULT_MODEL
        || (userModelFilter.IS_DEFAULT_MODEL && !userModelFilter.isDefaultProperty('id'))
      ) {
        conditionFilter.userId = userModelFilter.id;
      }
    }

    try {
      const data = await fsAsync.readFile(this._aclFile, 'utf8');

      const rows = data.split(/\n/).filter((v) => v !== '');
      if (!(
        rows.at(0).match(/^map\s+\$remote_user:\$http_x_node_proxy_port\s+\$access_status\s+{/)
        && rows.at(-1).match(/^}/)
        && data.match(/^\s+default\s+403;/m)
      )) {
        return [new InvalidAclFileException()];
      }

      const parseRowList = NginxProxyAclRepository._parseFile(rows.slice(1, -1), conditionFilter);
      if (parseRowList.length === 0) {
        return [null, [], 0];
      }

      const parseAclData = NginxProxyAclRepository._parseAcl(parseRowList);
      const result = NginxProxyAclRepository._fillModelList(parseAclData);

      return [null, result, result.length];
    } catch (error) {
      if (error instanceof FillDataRepositoryException) {
        return [error];
      }

      return [new RepositoryException(error)];
    }
  }

  create(model: ProxyAclModel): Promise<AsyncReturn<Error, ProxyAclModel>> {
    return Promise.resolve(undefined);
  }

  remove(id: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  private static _parseFile(rows: Array<string>, conditionFilter: ConditionFilter): Array<AclRowData> {
    const rowsRevers = rows.reverse();
    const tmpAclList: Array<Partial<AclRowData>> = [];
    const totalStep = 4;
    let step = 1;
    let aclCounter = -1;

    for (const row of rowsRevers) {
      if (row.match(/^\s+default\s+403;/)) {
        continue;
      }

      const aclMatch = row.match(/^\s+(.+)\s+200;$\s*$/);
      if (aclMatch && aclMatch[1]) {
        tmpAclList.push({row: aclMatch[1]});
        aclCounter++;
        step = 2;
        continue;
      }

      if (aclCounter > -1 && step > 1 && step <= totalStep) {
        step++;

        const fetchId = NginxProxyAclRepository._fetchRowId(row, tmpAclList[aclCounter]);
        if (fetchId.next && fetchId.capture) {
          continue;
        }

        const fetchUserId = NginxProxyAclRepository._fetchRowUserId(row, tmpAclList[aclCounter], conditionFilter.userId);
        if (fetchUserId.next) {
          if (!fetchUserId.capture) {
            step = 1;
          }

          continue;
        }

        const fetchDate = NginxProxyAclRepository._fetchRowDate(row, tmpAclList[aclCounter]);
        if (fetchDate.next && fetchDate.capture) {
          continue;
        }
      }

      step = 1;
    }

    return <Array<AclRowData>><unknown>tmpAclList.filter((v) => v.id && v.userId && v.date && v.row);
  }

  private static _fetchRowId(row, aclRowObj: Partial<AclRowData>): FetchReturn {
    const idMatch = row.match(/^\s+###\s+id:\s+([^s]+)/);
    if (!idMatch) {
      return {next: false, capture: false};
    }

    aclRowObj.id = idMatch[1];

    return {next: true, capture: true};
  }

  private static _fetchRowUserId(row, aclRowObj: Partial<AclRowData>, userIdFilter?: string): FetchReturn {
    const userIdMatch = row.match(/^\s+###\s+userId:\s+([^s]+)/);
    if (!userIdMatch) {
      return {next: false, capture: false};
    }
    if (!(
      userIdMatch[1] === NginxProxyAclRepository._ALL_USERS_KEY
      || !userIdFilter
      || (userIdFilter && userIdFilter === userIdMatch[1])
    )) {
      return {next: true, capture: false};
    }

    aclRowObj.userId = userIdMatch[1];

    return {next: true, capture: true};
  }

  private static _fetchRowDate(row, aclRowObj: Partial<AclRowData>): FetchReturn {
    const dateMatch = row.match(/^\s+###\s+date:\s+([^s]+)/);
    if (!dateMatch) {
      return {next: false, capture: false};
    }

    aclRowObj.date = dateMatch[1];

    return {next: true, capture: true};
  }

  private static _parseAcl(aclList: Array<AclRowData>): AclObj {
    const aclObj: AclObj = {
      isAll: false,
      userObj: {},
    };

    const findAllAccessAcl = aclList.find((v) => v.userId === NginxProxyAclRepository._ALL_USERS_KEY);
    if (findAllAccessAcl) {
      aclObj.isAll = true;
      aclObj.allObj = {
        id: findAllAccessAcl.id,
        date: new Date(Number(findAllAccessAcl.date)),
      };

      return aclObj;
    }

    for (const acl of aclList) {
      if (!(acl.userId in aclObj.userObj)) {
        aclObj.userObj[acl.userId] = [];
      }

      if (acl.row.substring(0, 1) !== '~') {
        NginxProxyAclRepository._userAclOnePortMatch(acl, aclObj.userObj[acl.userId]);
        continue;
      }

      NginxProxyAclRepository._userAclPortRegex(acl, aclObj.userObj[acl.userId]);
    }

    return aclObj;
  }

  private static _userAclOnePortMatch(acl: AclRowData, userAclList: Array<UserIdAclData>) {
    const portMatch = acl.row.match(/^.+:([0-9]+)/);
    if (!portMatch) {
      throw new FillDataRepositoryException<ProxyUpstreamModel>(['listenPort']);
    }

    userAclList.push({
      id: acl.id,
      isAccessToAllPort: false,
      portList: [Number(portMatch[1])],
      rowType: AclRowType.MATCH,
      insertDate: new Date(Number(acl.date)),
    });
  }

  private static _userAclPortRegex(acl: AclRowData, userAclList: Array<UserIdAclData>) {
    const portsMatch = acl.row.match(/^~.+:(.+)/);
    if (!portsMatch) {
      throw new FillDataRepositoryException<ProxyUpstreamModel>(['listenPort']);
    }

    const multiPortAccessList = portsMatch[1].trim().replace(/^\((.+)\)$/, '$1').split(/\|/);
    const portList = [];

    if (multiPortAccessList.length > 1) {
      for (const port of multiPortAccessList) {
        const portMatch = port.trim().replace(/^\((.+)\)$/, '$1').match(/^([0-9]+)$/);
        if (!portMatch) {
          throw new FillDataRepositoryException<ProxyUpstreamModel>(['listenPort']);
        }

        portList.push(Number(portMatch[1]));
      }
    }

    userAclList.push({
      id: acl.id,
      ...(portList.length === 0 ? {isAccessToAllPort: true} : {isAccessToAllPort: false, portList}),
      rowType: AclRowType.REGEX,
      insertDate: new Date(Number(acl.date)),
    });
  }

  private static _fillModelList(aclObj: AclObj): Array<ProxyAclModel> {
    if (aclObj.isAll) {
      const proxyAclModel = defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: aclObj.allObj.id,
          mode: ProxyAclMode.ALL,
          type: ProxyAclType.USER_PORT,
          proxies: [],
          insertDate: aclObj.allObj.date,
        },
        ['proxies'],
      );

      return [proxyAclModel];
    }

    const keys = Object.keys(aclObj.userObj);
    if (keys.length === 0) {
      return [];
    }

    const proxyAclList = [];
    for (let i = 0; i < keys.length; i++) {
      const userId = keys[i];
      const userModel = defaultModelFactory<UsersModel>(
        UsersModel,
        {
          id: userId,
          username: 'default-username',
          password: 'default-password',
          insertDate: new Date(),
        },
        ['username', 'password', 'insertDate'],
      );

      for (const acl of aclObj.userObj[userId]) {
        if (acl.isAccessToAllPort) {
          proxyAclList.push(defaultModelFactory<ProxyAclModel>(
            ProxyAclModel,
            {
              id: acl.id,
              mode: ProxyAclMode.ALL,
              type: ProxyAclType.USER_PORT,
              user: userModel,
              proxies: [],
              insertDate: acl.insertDate,
            },
            ['proxies'],
          ));
          continue;
        }

        proxyAclList.push(new ProxyAclModel({
          id: acl.id,
          mode: ProxyAclMode.CUSTOM,
          type: ProxyAclType.USER_PORT,
          user: userModel,
          proxies: acl.portList.map((port) => defaultModelFactory<ProxyUpstreamModel>(
            ProxyUpstreamModel,
            {
              id: 'default-id',
              listenAddr: 'default-listen-addr',
              listenPort: port,
              proxyDownstream: [],
              insertDate: new Date(),
            },
            ['id', 'listenAddr', 'proxyDownstream', 'insertDate'],
          )),
          insertDate: acl.insertDate,
        }));
      }
    }

    return proxyAclList;
  }
}
