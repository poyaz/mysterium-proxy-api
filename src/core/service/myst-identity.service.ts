import {Injectable} from '@nestjs/common';
import {IMystIdentityServiceInterface} from '@src-core/interface/i-myst-identity-service.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {AsyncReturn} from '@src-core/utility';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {NotFoundMystIdentityException} from '@src-core/exception/not-found-myst-identity.exception';
import {IMystApiRepositoryInterface} from '@src-core/interface/i-myst-api-repository.interface';
import {IRunnerServiceInterface} from '@src-core/interface/i-runner-service.interface';
import {RunnerModel, RunnerStatusEnum} from '@src-core/model/runner.model';
import {setTimeout} from 'timers/promises';
import {NotFoundException} from '@src-core/exception/not-found.exception';
import {NotRunningServiceException} from '@src-core/exception/not-running-service.exception';
import {CombineException} from '@src-core/exception/combine.exception';

@Injectable()
export class MystIdentityService implements IMystIdentityServiceInterface {
  constructor(
    private readonly _mystIdentityRepository: IGenericRepositoryInterface<MystIdentityModel>,
    private readonly _mystApiRepository: IMystApiRepositoryInterface,
    private readonly _runnerService: IRunnerServiceInterface,
  ) {
  }

  async getAll(filter: FilterModel<MystIdentityModel>): Promise<AsyncReturn<Error, Array<MystIdentityModel>>> {
    return this._mystIdentityRepository.getAll(filter);
  }

  async getById(id: string): Promise<AsyncReturn<Error, MystIdentityModel>> {
    const [error, data] = await this._mystIdentityRepository.getById(id);
    if (error) {
      return [error];
    }
    if (!data) {
      return [new NotFoundMystIdentityException()];
    }

    return [null, data];
  }

  async create(model: MystIdentityModel): Promise<AsyncReturn<Error, MystIdentityModel>> {
    const [createIdentityError, createIdentityData] = await this._mystIdentityRepository.add(model);
    if (createIdentityError) {
      return [createIdentityError];
    }

    await setTimeout(2000, 'resolved');

    const runnerFilter = new FilterModel<RunnerModel<MystIdentityModel>>();
    runnerFilter.addCondition({$opr: 'eq', label: {$namespace: MystIdentityModel.name, identity: model.identity}});

    const [runnerError, runnerDataList] = await this._runnerService.findAll<MystIdentityModel>(runnerFilter);
    if (runnerError) {
      return [runnerError];
    }
    if (runnerDataList.length === 0) {
      return [new NotFoundException()];
    }

    const runnerData = runnerDataList[0];
    if (runnerData.status !== RunnerStatusEnum.RUNNING) {
      return [new NotRunningServiceException()];
    }

    const [unlockError] = await this._mystApiRepository.unlockIdentity(runnerData, createIdentityData);
    if (unlockError) {
      const [removeError] = await this._mystIdentityRepository.remove(createIdentityData.id);
      if (removeError) {
        return [new CombineException([unlockError, removeError])];
      }

      return [unlockError];
    }

    const [registerError] = await this._mystApiRepository.registerIdentity(runnerData, createIdentityData.identity);
    if (registerError) {
      const [removeError] = await this._mystIdentityRepository.remove(createIdentityData.id);
      if (removeError) {
        return [new CombineException([registerError, removeError])];
      }

      return [registerError];
    }

    return [null, createIdentityData];
  }

  remove(id: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }
}
