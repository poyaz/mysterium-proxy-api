import {Injectable} from '@nestjs/common';
import {AsyncReturn} from '@src-core/utility';
import {FilterModel} from '@src-core/model/filter.model';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {IProviderServiceInterface} from '@src-core/interface/i-provider-service.interface';
import {IRunnerServiceInterface} from '@src-core/interface/i-runner-service.interface';

@Injectable()
export class MystService implements IProviderServiceInterface {
  constructor(
    private readonly _proxyApiRepository: IGenericRepositoryInterface<VpnProviderModel>,
    private readonly _runnerDockerService: IRunnerServiceInterface,
  ) {
  }

  async findAll(filter?: FilterModel<VpnProviderModel>): Promise<AsyncReturn<Error, Array<VpnProviderModel>>> {
    return this._proxyApiRepository.getAll(filter);
  }

  async create(model: VpnProviderModel): Promise<AsyncReturn<Error, VpnProviderModel>> {
    return Promise.resolve(undefined);
  }

  async remove(id: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }
}
