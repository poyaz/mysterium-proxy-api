import {UsersModel} from '@src-core/model/users.model';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {ModelRequireProp} from '@src-core/utility';

export class UsersProxyModel extends ProxyUpstreamModel {
  user: Pick<UsersModel, 'id' | 'username' | 'password'>;

  constructor(props: ModelRequireProp<typeof UsersProxyModel.prototype>) {
    super(props);

    Object.assign(this, props);
  }

  clone(): UsersProxyModel {
    return Object.assign(Object.create(this), this);
  }
}
