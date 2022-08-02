import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {AsyncReturn} from '@src-core/utility';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {IAccountIdentityFileRepository} from '@src-core/interface/i-account-identity-file.repository';

export class MystIdentityAggregateRepository implements IGenericRepositoryInterface<MystIdentityModel> {
  constructor(
    private readonly _mystIdentityFileRepository: IAccountIdentityFileRepository,
    private readonly _mystIdentityPgRepository: IGenericRepositoryInterface<MystIdentityModel>,
    private readonly _dockerRunnerRepository: IRunnerRepositoryInterface,
  ) {
  }

  getAll<F>(filter?: F): Promise<AsyncReturn<Error, Array<MystIdentityModel>>> {
    return Promise.resolve(undefined);
  }

  getById(id: string): Promise<AsyncReturn<Error, MystIdentityModel | null>> {
    return Promise.resolve(undefined);
  }

  add(model: MystIdentityModel): Promise<AsyncReturn<Error, MystIdentityModel>> {
    return Promise.resolve(undefined);
  }

  remove(id: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  update<F>(model: F): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }
}
