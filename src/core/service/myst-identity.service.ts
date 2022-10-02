import {Injectable} from '@nestjs/common';
import {IMystIdentityServiceInterface} from '@src-core/interface/i-myst-identity-service.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {AsyncReturn} from '@src-core/utility';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';

@Injectable()
export class MystIdentityService implements IMystIdentityServiceInterface {
  constructor(private readonly _mystIdentityRepository: IGenericRepositoryInterface<MystIdentityModel>) {
  }

  async getAll(filter: FilterModel<MystIdentityModel>): Promise<AsyncReturn<Error, Array<MystIdentityModel>>> {
    return this._mystIdentityRepository.getAll(filter);
  }

  getById(id: string): Promise<AsyncReturn<Error, MystIdentityModel>> {
    return Promise.resolve(undefined);
  }

  create(MystIdentityModel): Promise<AsyncReturn<Error, MystIdentityModel>> {
    return Promise.resolve(undefined);
  }

  remove(id: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }
}