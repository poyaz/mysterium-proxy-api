import {ModelRequireProp} from '@src-core/utility';
import {UsersModel} from '@src-core/model/users.model';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';

export enum ProxyAclMode {
  ALL = 'all',
  CUSTOM = 'custom',
}

export enum ProxyAclType {
  USER_PORT = 1,
}

export class ProxyAclModel {
  id: string;
  mode: ProxyAclMode;
  type: ProxyAclType;
  user?: Omit<UsersModel, 'clone'>;
  proxies: Array<ProxyUpstreamModel>;
  insertDate: Date;

  constructor(props: ModelRequireProp<typeof ProxyAclModel.prototype>) {
    Object.assign(this, props);
  }

  clone() {
    return Object.assign(Object.create(this), this);
  }
}
