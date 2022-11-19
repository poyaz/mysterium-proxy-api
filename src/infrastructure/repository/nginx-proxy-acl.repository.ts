import {ProxyAclMode, ProxyAclModel, ProxyAclType} from '@src-core/model/proxyAclModel';
import {AsyncReturn, Return} from '@src-core/utility';
import {FilterModel} from '@src-core/model/filter.model';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {IProxyAclRepositoryInterface} from '@src-core/interface/i-proxy-acl-repository.interface';
import * as fsAsync from 'fs/promises';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {InvalidAclFileException} from '@src-core/exception/invalid-acl-file.exception';
import {defaultModelFactory, defaultModelType} from '@src-core/model/defaultModel';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {UsersModel} from '@src-core/model/users.model';
import {ExistException} from '@src-core/exception/exist.exception';

type FetchReturn = { next: boolean, capture: boolean };

type ConditionFilter = { userId?: string };

enum AclRowType {
  REGEX = 'regex',
  MATCH = 'match',
}

type AclRowData = { id: string, userId: string, date: string, row: string, skip: boolean, lines: Array<number> };

type AclFileInfo = {
  startLine: number,
  endLine: number,
  defaultLine: number,
  aclList: Array<AclRowData>,
  rows: Array<string>,
}

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

    const [parseError, parseRowData] = await this._parseFile(conditionFilter);
    if (parseError) {
      return [parseError];
    }
    if (parseRowData.aclList.length === 0) {
      return [null, [], 0];
    }

    try {
      const parseAclData = NginxProxyAclRepository._convertAclToMApObject(parseRowData.aclList);
      const result = NginxProxyAclRepository._fillModelList(parseAclData);

      return [null, result, result.length];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async create(model: ProxyAclModel): Promise<AsyncReturn<Error, ProxyAclModel>> {
    const filterModel = new FilterModel<ProxyAclModel>();
    if (model.user) {
      filterModel.addCondition({
        $opr: 'eq',
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: model.user.id,
            username: 'default-username',
            password: 'default-password',
            insertDate: new Date(),
          },
          ['username', 'password', 'insertDate'],
        ),
      });
    }
    const [aclError, aclDataList] = await this.getAll(filterModel);
    if (aclError) {
      return [aclError];
    }

    const [error] = NginxProxyAclRepository._checkAclExist(aclDataList, model.proxies);
    if (error) {
      return [error];
    }

    const proxyAclModel = defaultModelFactory<ProxyAclModel>(
      ProxyAclModel,
      {
        id: this._identifier.generateId(),
        mode: model.mode,
        type: model.type,
        proxies: [],
        insertDate: new Date(),
      },
      ['proxies'],
    );
    if (model.user) {
      proxyAclModel.user = model.user;
    }

    const appendAclData = [];
    switch (true) {
      case model.mode === ProxyAclMode.ALL && !model.user:
        appendAclData.push(
          [
            '',
            `    ### id: ${proxyAclModel.id}`,
            `    ### userId: -`,
            `    ### date: ${proxyAclModel.insertDate.getTime()}`,
            `    ~.+:[0-9]+ 200;`,
          ].join('\n'),
        );
        break;
      case  model.mode === ProxyAclMode.ALL && typeof model.user !== 'undefined':
        appendAclData.push(
          [
            '',
            `    ### id: ${proxyAclModel.id}`,
            `    ### userId: ${model.user.id}`,
            `    ### date: ${proxyAclModel.insertDate.getTime()}`,
            `    ~${model.user.username}:[0-9]+ 200;`,
          ].join('\n'),
        );
        break;
      case model.mode === ProxyAclMode.CUSTOM && typeof model.user !== 'undefined' && model.proxies.length === 1:
        appendAclData.push(
          [
            '',
            `    ### id: ${proxyAclModel.id}`,
            `    ### userId: ${model.user.id}`,
            `    ### date: ${proxyAclModel.insertDate.getTime()}`,
            `    ${model.user.username}:${model.proxies[0].listenPort} 200;`,
          ].join('\n'),
        );
        proxyAclModel.proxies = model.proxies;
        break;
      case model.mode === ProxyAclMode.CUSTOM && typeof model.user !== 'undefined' && model.proxies.length > 1:
        appendAclData.push(
          [
            '',
            `    ### id: ${proxyAclModel.id}`,
            `    ### userId: ${model.user.id}`,
            `    ### date: ${proxyAclModel.insertDate.getTime()}`,
            `    ~${model.user.username}:(${model.proxies.map((v) => v.listenPort).join('|')}) 200;`,
          ].join('\n'),
        );
        proxyAclModel.proxies = model.proxies;
        break;
    }
    if (appendAclData.length === 0) {
      return [new FillDataRepositoryException<ProxyAclModel>(['proxies'])];
    }

    try {
      const aclData = await fsAsync.readFile(this._aclFile, 'utf8');
      const aclRowsList = aclData.split(/\n/);

      let rows = [];
      for (let i = 0; i < aclRowsList.length; i++) {
        const row = aclRowsList[i];
        if (row.match(/^}/)) {
          break;
        }

        rows.push(row);
      }

      rows.push(appendAclData);
      rows.push('}\n');

      await fsAsync.writeFile(this._aclFile, rows.join('\n'), 'utf8');

      return [null, proxyAclModel];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async remove(id: string): Promise<AsyncReturn<Error, null>> {
    const [parseError, parseRowData] = await this._parseFile({});
    if (parseError) {
      return [parseError];
    }
    if (parseRowData.aclList.length === 0) {
      return [null, null];
    }

    const find = parseRowData.aclList.find((v) => v.id === id);
    if (!find) {
      return [null, null];
    }

    const overwriteRows = parseRowData.rows.filter((v, i) => find.lines.indexOf(i + 1) === -1 && !(v === '' && i === find.lines.at(-1)));

    try {
      await fsAsync.writeFile(this._aclFile, overwriteRows.join('\n'), 'utf8');

      return [null, null];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  private async _parseFile(conditionFilter: ConditionFilter): Promise<Return<Error, AclFileInfo>> {
    let data;
    try {
      data = await fsAsync.readFile(this._aclFile, 'utf8');
    } catch (error) {
      return [new RepositoryException(error)];
    }

    const rows = data.split(/\n/);
    const totalLine = rows.length;
    const rowsRevers = [...rows].reverse();
    const aclInfoFile: AclFileInfo = {
      startLine: -1,
      endLine: -1,
      defaultLine: -1,
      aclList: [],
      rows,
    };
    const tmpAclList: Array<Pick<AclRowData, 'row' | 'skip' | 'lines'> & Partial<Omit<AclRowData, 'row' | 'skip' | 'lines'>>> = [];

    const totalStep = 4;
    let step = 1;
    let aclCounter = -1;
    for (let i = 0; i < rowsRevers.length; i++) {
      let row = rowsRevers[i];
      let lineNumber = totalLine - i;

      if (!row) {
        continue;
      }
      if (row.match(/^map\s+\$remote_user:\$http_x_node_proxy_port\s+\$access_status\s+{/)) {
        aclInfoFile.startLine = lineNumber;
        continue;
      }
      if (row.match(/^}/)) {
        aclInfoFile.endLine = lineNumber;
        continue;
      }
      if (row.match(/^\s+default\s+403;/)) {
        aclInfoFile.defaultLine = lineNumber;
        continue;
      }

      const aclMatch = row.match(/^\s+(.+)\s+200;$\s*$/);
      if (aclMatch && aclMatch[1]) {
        tmpAclList.push({row: aclMatch[1], skip: false, lines: [lineNumber]});
        aclCounter++;
        step = 2;
        continue;
      }

      if (aclCounter > -1 && step > 1 && step <= totalStep) {
        step++;

        const fetchId = NginxProxyAclRepository._fetchRowId(row, tmpAclList[aclCounter]);
        if (fetchId.next && fetchId.capture) {
          tmpAclList[aclCounter].lines.push(lineNumber);
          continue;
        }

        const fetchUserId = NginxProxyAclRepository._fetchRowUserId(row, tmpAclList[aclCounter], conditionFilter.userId);
        if (fetchUserId.next) {
          tmpAclList[aclCounter].lines.push(lineNumber);
          if (!fetchUserId.capture) {
            tmpAclList[aclCounter].skip = true;
          }

          continue;
        }

        const fetchDate = NginxProxyAclRepository._fetchRowDate(row, tmpAclList[aclCounter]);
        if (fetchDate.next && fetchDate.capture) {
          tmpAclList[aclCounter].lines.push(lineNumber);
          continue;
        }
      }

      step = 1;
    }

    if (aclInfoFile.startLine === -1 || aclInfoFile.endLine === -1 || aclInfoFile.defaultLine === -1) {
      return [new InvalidAclFileException()];
    }
    const validAclList = tmpAclList.filter((v) => v.id && v.userId && v.date && v.row);
    if (validAclList.length !== tmpAclList.length) {
      return [new InvalidAclFileException()];
    }

    tmpAclList.map((v) => v.lines.sort());
    aclInfoFile.aclList = <Array<AclRowData>><unknown>tmpAclList.filter((v) => !v.skip);

    return [null, aclInfoFile];
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

    aclRowObj.userId = userIdMatch[1];

    let capture = true;
    if (!(
      userIdMatch[1] === NginxProxyAclRepository._ALL_USERS_KEY
      || !userIdFilter
      || (userIdFilter && userIdFilter === userIdMatch[1])
    )) {
      capture = false;
    }

    return {next: true, capture};
  }

  private static _fetchRowDate(row, aclRowObj: Partial<AclRowData>): FetchReturn {
    const dateMatch = row.match(/^\s+###\s+date:\s+([^s]+)/);
    if (!dateMatch) {
      return {next: false, capture: false};
    }

    aclRowObj.date = dateMatch[1];

    return {next: true, capture: true};
  }

  private static _convertAclToMApObject(aclList: Array<AclRowData>): AclObj {
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

  private static _checkAclExist(aclList: Array<ProxyAclModel>, proxyList: Array<ProxyUpstreamModel>): Return<Error, null> {
    const [allAccessError] = NginxProxyAclRepository._checkAllAccessExist(aclList);
    if (allAccessError) {
      return [allAccessError];
    }

    const [userAccessError] = NginxProxyAclRepository._checkUserAccessExist(aclList, proxyList);
    if (userAccessError) {
      return [userAccessError];
    }

    return [null, null];
  }

  private static _checkAllAccessExist(aclList: Array<ProxyAclModel>): Return<Error, null> {
    const allAccessFind = aclList.find((v) => v.mode === ProxyAclMode.ALL && !v.user);
    if (allAccessFind) {
      return [new ExistException()];
    }

    return [null, null];
  }

  private static _checkUserAccessExist(aclList: Array<ProxyAclModel>, proxyList: Array<ProxyUpstreamModel>): Return<Error, null> {
    const userAllAccessFind = aclList.find((v) => v.mode === ProxyAclMode.ALL && v.user);
    if (userAllAccessFind) {
      return [new ExistException()];
    }

    const userPortAccessList = aclList
      .filter((v) => v.mode === ProxyAclMode.CUSTOM && v.user)
      .map((v) => v.proxies)
      .flat();
    for (const proxy of proxyList) {
      for (const userPortAccessProxy of userPortAccessList) {
        if (proxy.listenPort === userPortAccessProxy.listenPort) {
          return [new ExistException()];
        }
      }
    }

    return [null, null];
  }
}
