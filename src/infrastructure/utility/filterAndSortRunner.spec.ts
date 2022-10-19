import {FilterModel, SortEnum} from '@src-core/model/filter.model';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {filterAndSortRunner} from '@src-infrastructure/utility/filterAndSortRunner';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';

describe('filterAndSortRunner', () => {
  let identifierMock: MockProxy<IIdentifier>;

  let inputFilterPaginationModel: FilterModel<RunnerModel>;
  let inputFilterSortAndPaginationNameModel: FilterModel<RunnerModel>;
  let inputFilterSkipPaginationModel: FilterModel<RunnerModel>;

  let runnerData1: RunnerModel;
  let runnerData2: RunnerModel;
  let runnerData3: RunnerModel;

  beforeEach(() => {
    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    inputFilterPaginationModel = new FilterModel<RunnerModel>({page: 2, limit: 1});

    inputFilterSortAndPaginationNameModel = new FilterModel<RunnerModel>({page: 2, limit: 1});
    inputFilterSortAndPaginationNameModel.addSortBy({name: SortEnum.ASC});

    inputFilterSkipPaginationModel = new FilterModel<RunnerModel>({skipPagination: true});

    runnerData1 = new RunnerModel<string>({
      id: identifierMock.generateId(),
      serial: 'serial1',
      name: 'container1',
      service: RunnerServiceEnum.MYST,
      exec: RunnerExecEnum.DOCKER,
      socketType: RunnerSocketTypeEnum.NONE,
      status: RunnerStatusEnum.RUNNING,
      insertDate: new Date(),
    });
    runnerData2 = new RunnerModel<string>({
      id: identifierMock.generateId(),
      serial: 'serial2',
      name: 'container2',
      service: RunnerServiceEnum.SQUID,
      exec: RunnerExecEnum.DOCKER,
      socketType: RunnerSocketTypeEnum.NONE,
      status: RunnerStatusEnum.RESTARTING,
      insertDate: new Date(),
    });
    runnerData3 = new RunnerModel<string>({
      id: identifierMock.generateId(),
      serial: 'serial3',
      name: 'container3',
      service: RunnerServiceEnum.SQUID,
      exec: RunnerExecEnum.DOCKER,
      socketType: RunnerSocketTypeEnum.NONE,
      status: RunnerStatusEnum.RESTARTING,
      insertDate: new Date(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it(`Filter and sort runner model with pagination`, () => {
    const inputData = [runnerData1, runnerData3, runnerData2];

    const [result, count] = filterAndSortRunner(inputData, inputFilterPaginationModel);

    expect(result[0]).toMatchObject<RunnerModel>({
      id: runnerData3.id,
      serial: runnerData3.serial,
      name: runnerData3.name,
      service: runnerData3.service,
      exec: runnerData3.exec,
      socketType: runnerData3.socketType,
      status: runnerData3.status,
      insertDate: runnerData3.insertDate,
    });
    expect(count).toEqual(3);
  });

  it(`Filter and sort runner model with sort name and pagination`, () => {
    const inputData = [runnerData1, runnerData2, runnerData3];

    const [result, count] = filterAndSortRunner(inputData, inputFilterSortAndPaginationNameModel);

    expect(result[0]).toMatchObject<RunnerModel>({
      id: runnerData2.id,
      serial: runnerData2.serial,
      name: runnerData2.name,
      service: runnerData2.service,
      exec: runnerData2.exec,
      socketType: runnerData2.socketType,
      status: runnerData2.status,
      insertDate: runnerData2.insertDate,
    });
    expect(count).toEqual(3);
  });

  it(`Filter and sort runner model with skip pagination`, () => {
    const inputData = [runnerData1, runnerData2, runnerData3];

    const [result, count] = filterAndSortRunner(inputData, inputFilterSkipPaginationModel);

    expect(result[0]).toMatchObject<RunnerModel>({
      id: runnerData1.id,
      serial: runnerData1.serial,
      name: runnerData1.name,
      service: runnerData1.service,
      exec: runnerData1.exec,
      socketType: runnerData1.socketType,
      status: runnerData1.status,
      insertDate: runnerData1.insertDate,
    });
    expect(result[1]).toMatchObject<RunnerModel>({
      id: runnerData2.id,
      serial: runnerData2.serial,
      name: runnerData2.name,
      service: runnerData2.service,
      exec: runnerData2.exec,
      socketType: runnerData2.socketType,
      status: runnerData2.status,
      insertDate: runnerData2.insertDate,
    });
    expect(result[2]).toMatchObject<RunnerModel>({
      id: runnerData3.id,
      serial: runnerData3.serial,
      name: runnerData3.name,
      service: runnerData3.service,
      exec: runnerData3.exec,
      socketType: runnerData3.socketType,
      status: runnerData3.status,
      insertDate: runnerData3.insertDate,
    });
    expect(count).toEqual(3);
  });
});
