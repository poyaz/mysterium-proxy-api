import {Injectable} from '@nestjs/common';
import {IProviderServiceInterface} from '@src-core/interface/i-provider-service.interface';
import {AsyncReturn} from '@src-core/utility';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {FilterModel} from '@src-core/model/filter.model';
import {IRunnerServiceInterface} from '@src-core/interface/i-runner-service.interface';
import {IMystApiRepositoryInterface} from '@src-core/interface/i-myst-api-repository.interface';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';

@Injectable()
export class MystProviderService implements IProviderServiceInterface {
  constructor(
    private readonly _mystApiRepository: IMystApiRepositoryInterface,
    private readonly _runnerService: IRunnerServiceInterface,
  ) {
  }

  async getAll(filter?: FilterModel<VpnProviderModel>): Promise<AsyncReturn<Error, Array<VpnProviderModel>>> {
    const fakeRunner = defaultModelFactory<RunnerModel>(
      RunnerModel,
      {
        id: 'id',
        serial: 'serial',
        name: 'name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      },
      ['id', 'serial', 'name', 'service', 'exec', 'socketType', 'status', 'insertDate'],
    );

    return this._mystApiRepository.getAll(fakeRunner, filter);
  }

  up(id: string): Promise<AsyncReturn<Error, VpnProviderModel>> {
    return Promise.resolve(undefined);
  }

  down(id: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }
}
