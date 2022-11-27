import {Injectable} from '@nestjs/common';
import {IProxyAclServiceInterface} from '@src-core/interface/i-proxy-acl-service.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {ProxyAclModel} from '@src-core/model/proxyAclModel';
import {AsyncReturn} from '@src-core/utility';
import {IProxyAclRepositoryInterface} from '@src-core/interface/i-proxy-acl-repository.interface';
import {IUsersServiceInterface} from '@src-core/interface/i-users-service.interface';

@Injectable()
export class ProxyAclService implements IProxyAclServiceInterface {
  constructor(
    private readonly _proxyAclRepository: IProxyAclRepositoryInterface,
    private readonly _usersService: IUsersServiceInterface,
  ) {
  }

  async getAll(filter?: FilterModel<ProxyAclModel>): Promise<AsyncReturn<Error, Array<ProxyAclModel>>> {
    return this._proxyAclRepository.getAll(filter);
  }

  async create(model: ProxyAclModel): Promise<AsyncReturn<Error, ProxyAclModel>> {
    if (model.user) {
      const [userError, userData] = await this._usersService.findOne(model.user.id);
      if (userError) {
        return [userError];
      }

      model.user = userData;
    }
    return this._proxyAclRepository.create(model);
  }

  remove(id: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }
}
