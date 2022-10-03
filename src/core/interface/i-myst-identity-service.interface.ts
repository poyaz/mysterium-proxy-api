import {AsyncReturn} from '@src-core/utility';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {FilterModel} from '@src-core/model/filter.model';

export interface IMystIdentityServiceInterface {
  getAll(filter: FilterModel<MystIdentityModel>): Promise<AsyncReturn<Error, Array<MystIdentityModel>>>;

  getById(id: string): Promise<AsyncReturn<Error, MystIdentityModel>>;

  create(model: MystIdentityModel): Promise<AsyncReturn<Error, MystIdentityModel>>;

  remove(id: string): Promise<AsyncReturn<Error, null>>;
}
