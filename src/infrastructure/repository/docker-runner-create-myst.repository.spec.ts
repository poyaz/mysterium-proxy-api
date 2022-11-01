import {DockerRunnerCreateMystRepository} from './docker-runner-create-myst.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {Test, TestingModule} from '@nestjs/testing';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {
  RunnerExecEnum, RunnerLabelNamespace,
  RunnerModel,
  RunnerServiceEnum,
  RunnerServiceVolumeEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {defaultModelFactory, defaultModelType} from '@src-core/model/defaultModel';
import {RepositoryException} from '@src-core/exception/repository.exception';
import Docker = require('dockerode');
import {DockerLabelParser} from '@src-infrastructure/utility/docker-label-parser';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import Dockerode, {EndpointSettings} from 'dockerode';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {setTimeout} from 'timers/promises';

jest.mock('@src-infrastructure/utility/docker-label-parser');
jest.mock('timers/promises');

describe('DockerRunnerCreateMystRepository', () => {
  let repository: DockerRunnerCreateMystRepository;
  let docker: MockProxy<Docker>;
  let identifierMock: MockProxy<IIdentifier>;
  let mystDataVolume: string;
  let networkName: string;
  let imageName: string;
  let httpPort: number;
  let namespace: string;

  beforeEach(async () => {
    docker = mock<Docker>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    mystDataVolume = '/var/lib/mysterium-node/keystore/';
    networkName = 'mysterium-proxy-api_main';
    imageName = 'mysterium-proxy-api-myst';
    httpPort = 4449;
    namespace = 'com.mysterium-proxy';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.DOCKER_DYNAMIC_MODULE,
          useValue: docker,
        },
        {
          provide: ProviderTokenEnum.IDENTIFIER_UUID,
          useValue: identifierMock,
        },
        {
          provide: DockerRunnerCreateMystRepository,
          inject: [ProviderTokenEnum.DOCKER_DYNAMIC_MODULE, ProviderTokenEnum.IDENTIFIER_UUID],
          useFactory: (docker: Docker, identity: IIdentifier) =>
            new DockerRunnerCreateMystRepository(docker, identity, {
              imageName,
              networkName,
              dataVolumePath: mystDataVolume,
              httpPort,
            }, namespace),
        },
      ],
    }).compile();

    repository = module.get<DockerRunnerCreateMystRepository>(DockerRunnerCreateMystRepository);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe(`Create myst container`, () => {
    let inputRunner: RunnerModel<MystIdentityModel>;
    let outputMystIdentityInvalid: defaultModelType<MystIdentityModel>;
    let outputMystIdentityValid: defaultModelType<MystIdentityModel>;
    let outputVolume: { inspect: any };
    let outputVolumeInspect: Object;
    let outputEmptyCreatedContainerList: Array<Dockerode.ContainerInfo>;
    let outputCreatedContainerList: Array<Dockerode.ContainerInfo>;
    let outputExistContainerList: Array<Dockerode.ContainerInfo>;
    let outputContainer: { remove: any };
    let outputNetwork: { inspect: any };
    let outputLimitedNetworkInspect: Object;
    let outputNetworkInspect: Object;
    let outputCreateContainer: { id: string, start: any };

    beforeEach(() => {
      inputRunner = defaultModelFactory<RunnerModel<MystIdentityModel>>(
        RunnerModel,
        {
          id: 'default-id',
          serial: 'default-serial',
          name: 'myst',
          service: RunnerServiceEnum.MYST,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.HTTP,
          label: {
            $namespace: MystIdentityModel.name,
            id: identifierMock.generateId(),
            identity: 'identity-1',
            passphrase: 'passphrase-1',
          },
          volumes: [
            {
              source: '/path/of/identity-1',
              dest: '-',
              name: RunnerServiceVolumeEnum.MYST_KEYSTORE,
            },
          ],
          status: RunnerStatusEnum.CREATING,
          insertDate: new Date(),
        },
        ['id', 'serial', 'status', 'insertDate'],
      );

      outputMystIdentityInvalid = defaultModelFactory<MystIdentityModel>(
        MystIdentityModel,
        {
          id: 'default-id',
          identity: 'default-identity',
          passphrase: inputRunner.label.passphrase,
          path: 'default-path',
          filename: 'default-filename',
          isUse: false,
          insertDate: new Date(),
        },
        ['id', 'identity', 'path', 'filename', 'isUse', 'insertDate'],
      );

      outputMystIdentityValid = defaultModelFactory<MystIdentityModel>(
        MystIdentityModel,
        {
          id: inputRunner.label.id,
          identity: inputRunner.label.identity,
          passphrase: inputRunner.label.passphrase,
          path: 'default-path',
          filename: 'default-filename',
          isUse: false,
          insertDate: new Date(),
        },
        ['path', 'filename', 'isUse', 'insertDate'],
      );

      outputVolume = {inspect: jest.fn()};
      outputVolumeInspect = {};

      outputEmptyCreatedContainerList = [];
      outputCreatedContainerList = [
        {
          Id: 'container-id',
          Names: ['/container-name'],
          Image: 'image-name:image-tag',
          ImageID: 'sha256:image-id',
          Command: '/bin/sh',
          Created: 1665472068,
          Ports: [],
          Labels: {
            [`${namespace}.project`]: RunnerServiceEnum.MYST,
            [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
          },
          State: 'created',
          Status: 'Created',
          HostConfig: {NetworkMode: 'bridge'},
          NetworkSettings: {Networks: {}},
          Mounts: [],
        },
      ];
      outputExistContainerList = [
        {
          Id: 'container-id1',
          Names: [`/${RunnerServiceEnum.MYST}1`],
          Image: 'image-name:image-tag',
          ImageID: 'sha256:image-id',
          Command: '/bin/sh',
          Created: 1665472068,
          Ports: [],
          Labels: {
            [`${namespace}.project`]: RunnerServiceEnum.MYST,
            [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
          },
          State: 'running',
          Status: 'Running',
          HostConfig: {NetworkMode: 'bridge'},
          NetworkSettings: {Networks: {}},
          Mounts: [],
        },
        {
          Id: 'container-id3',
          Names: [`/${RunnerServiceEnum.MYST}3`],
          Image: 'image-name:image-tag',
          ImageID: 'sha256:image-id',
          Command: '/bin/sh',
          Created: 1665472068,
          Ports: [],
          Labels: {
            [`${namespace}.project`]: RunnerServiceEnum.MYST,
            [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
          },
          State: 'running',
          Status: 'Running',
          HostConfig: {NetworkMode: 'bridge'},
          NetworkSettings: {Networks: {}},
          Mounts: [],
        },
      ];

      outputContainer = {remove: jest.fn()};

      outputNetwork = {inspect: jest.fn()};
      outputLimitedNetworkInspect = {
        'Name': networkName,
        'Id': '7d86d31b1478e7cca9ebed7e73aa0fdeec46c5ca29497431d3007d2d9e15ed99',
        'Created': '2016-10-19T04:33:30.360899459Z',
        'Scope': 'local',
        'Driver': 'bridge',
        'EnableIPv6': false,
        'IPAM': {
          'Driver': 'default',
          'Config': [
            {
              'Subnet': '172.19.0.0/31',
              'Gateway': '172.19.0.1',
            },
          ],
          'Options': {
            'foo': 'bar',
          },
        },
        'Internal': false,
        'Attachable': false,
        'Ingress': false,
        'Containers': {},
        'Options': {
          'com.docker.network.bridge.default_bridge': 'true',
          'com.docker.network.bridge.enable_icc': 'true',
          'com.docker.network.bridge.enable_ip_masquerade': 'true',
          'com.docker.network.bridge.host_binding_ipv4': '0.0.0.0',
          'com.docker.network.bridge.name': 'docker0',
          'com.docker.network.driver.mtu': '1500',
        },
        'Labels': {
          'com.example.some-label': 'some-value',
          'com.example.some-other-label': 'some-other-value',
        },
      };
      outputNetworkInspect = {
        'Name': networkName,
        'Id': '7d86d31b1478e7cca9ebed7e73aa0fdeec46c5ca29497431d3007d2d9e15ed99',
        'Created': '2016-10-19T04:33:30.360899459Z',
        'Scope': 'local',
        'Driver': 'bridge',
        'EnableIPv6': false,
        'IPAM': {
          'Driver': 'default',
          'Config': [
            {
              'Subnet': '172.19.0.0/28',
              'Gateway': '172.19.0.1',
            },
          ],
          'Options': {
            'foo': 'bar',
          },
        },
        'Internal': false,
        'Attachable': false,
        'Ingress': false,
        'Containers': {
          '19a4d5d687db25203351ed79d478946f861258f018fe384f229f2efa4b23513c': {
            'Name': 'test',
            'EndpointID': '628cadb8bcb92de107b2a1e516cbffe463e321f548feb37697cce00ad694f21a',
            'MacAddress': '02:42:ac:13:00:02',
            'IPv4Address': '172.19.0.2/28',
            'IPv6Address': '',
          },
        },
        'Options': {
          'com.docker.network.bridge.default_bridge': 'true',
          'com.docker.network.bridge.enable_icc': 'true',
          'com.docker.network.bridge.enable_ip_masquerade': 'true',
          'com.docker.network.bridge.host_binding_ipv4': '0.0.0.0',
          'com.docker.network.bridge.name': 'docker0',
          'com.docker.network.driver.mtu': '1500',
        },
        'Labels': {
          'com.example.some-label': 'some-value',
          'com.example.some-other-label': 'some-other-value',
        },
      };

      outputCreateContainer = {id: 'container-id', start: jest.fn()};
    });

    it(`Should error create container when get invalid label`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([new FillDataRepositoryException<RunnerLabelNamespace<Object>>(['$namespace'])]);
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
        };
      });

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(error).toBeInstanceOf(FillDataRepositoryException);
      expect((<FillDataRepositoryException<RunnerLabelNamespace<Object>>>error).fillProperties).toEqual(expect.arrayContaining(['$namespace']));
    });

    it(`Should error create container when get myst identity model`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([new FillDataRepositoryException<any>([MystIdentityModel.name])]);
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
        };
      });

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(error).toBeInstanceOf(FillDataRepositoryException);
      expect((<FillDataRepositoryException<RunnerLabelNamespace<any>>>error).fillProperties).toEqual(expect.arrayContaining([MystIdentityModel.name]));
    });

    it(`Should error create container when not filling required field of myst identity model`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([null, outputMystIdentityInvalid]);
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
        };
      });

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(error).toBeInstanceOf(FillDataRepositoryException);
      expect((<FillDataRepositoryException<RunnerLabelNamespace<MystIdentityModel>>>error).fillProperties).toEqual(expect.arrayContaining(['id']));
    });

    it(`Should error create container when get volume info`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([null, outputMystIdentityValid]);
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.volume.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.volume.myst-identity-model.identity`]: outputMystIdentityValid.identity,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      const executeError = new Error('Error on get volume');
      docker.getVolume.mockRejectedValue(<never>executeError);

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(docker.getVolume).toHaveBeenCalled();
      expect(docker.getVolume).toHaveBeenCalledWith(`myst-keystore-${outputMystIdentityValid.identity}`);
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container when volume exist and inspect volume data`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([null, outputMystIdentityValid]);
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.volume.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.volume.myst-identity-model.identity`]: outputMystIdentityValid.identity,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.getVolume.mockResolvedValue(<never>outputVolume);
      const executeError = new Error('Error on inspect volume');
      outputVolume.inspect.mockRejectedValue(<never>executeError);

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(docker.getVolume).toHaveBeenCalled();
      expect(docker.getVolume).toHaveBeenCalledWith(`myst-keystore-${outputMystIdentityValid.identity}`);
      expect(outputVolume.inspect).toHaveBeenCalled();
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container when volume not exist and need create volume`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([null, outputMystIdentityValid]);
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.volume.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.volume.myst-identity-model.identity`]: outputMystIdentityValid.identity,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.getVolume.mockResolvedValue(<never>outputVolume);
      const notFoundError = new Error('Volume not found');
      notFoundError['statusCode'] = 404;
      outputVolume.inspect.mockRejectedValue(notFoundError);
      const executeError = new Error('Error in create on volume');
      docker.createVolume.mockRejectedValue(executeError);


      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(1);
      expect(docker.getVolume).toHaveBeenCalled();
      expect(docker.getVolume).toHaveBeenCalledWith(`myst-keystore-${outputMystIdentityValid.identity}`);
      expect(outputVolume.inspect).toHaveBeenCalled();
      expect(convertLabelToObjectMock).toHaveBeenCalled();
      expect(docker.createVolume).toHaveBeenCalled();
      expect(docker.createVolume).toHaveBeenCalledWith(expect.objectContaining({
        Name: `myst-keystore-${outputMystIdentityValid.identity}`,
        Driver: 'local',
        DriverOpts: {
          device: inputRunner.volumes.find((v) => v.name === RunnerServiceVolumeEnum.MYST_KEYSTORE).source,
          o: 'bind',
          type: 'none',
        },
        Labels: {
          [`${namespace}.volume.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.volume.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        },
      }));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container when check container was created`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([null, outputMystIdentityValid]);
      const convertLabelToObjectMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.getVolume.mockResolvedValue(<never>outputVolume);
      outputVolume.inspect.mockResolvedValue(outputVolumeInspect);
      const executeError = new Error('Error in get list of container');
      docker.listContainers.mockRejectedValue(<never>executeError);

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(2);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['passphrase']));
      expect(docker.getVolume).toHaveBeenCalled();
      expect(docker.getVolume).toHaveBeenCalledWith(`myst-keystore-${outputMystIdentityValid.identity}`);
      expect(outputVolume.inspect).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalled();
      expect(convertLabelToObjectMock.mock.calls[1][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[1][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledWith(expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      }));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container when get old container if container was created and not running`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([null, outputMystIdentityValid]);
      const convertLabelToObjectMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.getVolume.mockResolvedValue(<never>outputVolume);
      outputVolume.inspect.mockResolvedValue(outputVolumeInspect);
      docker.listContainers.mockResolvedValue(outputCreatedContainerList);
      const executeError = new Error('Error in get container');
      docker.getContainer.mockRejectedValue(<never>executeError);

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(2);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['passphrase']));
      expect(docker.getVolume).toHaveBeenCalled();
      expect(docker.getVolume).toHaveBeenCalledWith(`myst-keystore-${outputMystIdentityValid.identity}`);
      expect(outputVolume.inspect).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalled();
      expect(convertLabelToObjectMock.mock.calls[1][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[1][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledWith(expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      }));
      expect(docker.getContainer).toHaveBeenCalled();
      expect(docker.getContainer).toHaveBeenCalledWith(outputCreatedContainerList[0].Id);
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container when remove old container if container was created and not running`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([null, outputMystIdentityValid]);
      const convertLabelToObjectMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.getVolume.mockResolvedValue(<never>outputVolume);
      outputVolume.inspect.mockResolvedValue(outputVolumeInspect);
      docker.listContainers.mockResolvedValue(outputCreatedContainerList);
      docker.getContainer.mockResolvedValue(<never>outputContainer);
      const executeError = new Error('Error in remove container');
      outputContainer.remove.mockRejectedValue(executeError);

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(2);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['passphrase']));
      expect(docker.getVolume).toHaveBeenCalled();
      expect(docker.getVolume).toHaveBeenCalledWith(`myst-keystore-${outputMystIdentityValid.identity}`);
      expect(outputVolume.inspect).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalled();
      expect(convertLabelToObjectMock.mock.calls[1][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[1][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledWith(expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      }));
      expect(docker.getContainer).toHaveBeenCalled();
      expect(docker.getContainer).toHaveBeenCalledWith(outputCreatedContainerList[0].Id);
      expect(outputContainer.remove).toHaveBeenCalled();
      expect(outputContainer.remove).toHaveBeenCalledWith(expect.objectContaining({v: true, force: true}));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container when get network info`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([null, outputMystIdentityValid]);
      const convertLabelToObjectMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.getVolume.mockResolvedValue(<never>outputVolume);
      outputVolume.inspect.mockResolvedValue(outputVolumeInspect);
      docker.listContainers.mockResolvedValue(outputEmptyCreatedContainerList);
      const executeError = new Error('Error on get network');
      docker.getNetwork.mockRejectedValue(<never>executeError);

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(2);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['passphrase']));
      expect(docker.getVolume).toHaveBeenCalled();
      expect(docker.getVolume).toHaveBeenCalledWith(`myst-keystore-${outputMystIdentityValid.identity}`);
      expect(outputVolume.inspect).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalled();
      expect(convertLabelToObjectMock.mock.calls[1][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[1][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledWith(expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      }));
      expect(docker.getNetwork).toHaveBeenCalled();
      expect(docker.getNetwork).toHaveBeenCalledWith(networkName);
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container when inspect network data`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([null, outputMystIdentityValid]);
      const convertLabelToObjectMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.getVolume.mockResolvedValue(<never>outputVolume);
      outputVolume.inspect.mockResolvedValue(outputVolumeInspect);
      docker.listContainers.mockResolvedValue(outputEmptyCreatedContainerList);
      docker.getNetwork.mockResolvedValue(<never>outputNetwork);
      const executeError = new Error('Error on inspect network');
      outputNetwork.inspect.mockRejectedValue(<never>executeError);

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(2);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['passphrase']));
      expect(docker.getVolume).toHaveBeenCalled();
      expect(docker.getVolume).toHaveBeenCalledWith(`myst-keystore-${outputMystIdentityValid.identity}`);
      expect(outputVolume.inspect).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalled();
      expect(convertLabelToObjectMock.mock.calls[1][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[1][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledWith(expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      }));
      expect(docker.getNetwork).toHaveBeenCalled();
      expect(docker.getNetwork).toHaveBeenCalledWith(networkName);
      expect(outputNetwork.inspect).toHaveBeenCalled();
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container when can't found any ip in pool`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([null, outputMystIdentityValid]);
      const convertLabelToObjectMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.getVolume.mockResolvedValue(<never>outputVolume);
      outputVolume.inspect.mockResolvedValue(outputVolumeInspect);
      docker.listContainers.mockResolvedValue(outputEmptyCreatedContainerList);
      docker.getNetwork.mockResolvedValue(<never>outputNetwork);
      outputNetwork.inspect.mockResolvedValue(outputLimitedNetworkInspect);

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(2);
      expect(convertLabelToObjectMock.mock.calls[0][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['passphrase']));
      expect(docker.getVolume).toHaveBeenCalled();
      expect(docker.getVolume).toHaveBeenCalledWith(`myst-keystore-${outputMystIdentityValid.identity}`);
      expect(outputVolume.inspect).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectMock.mock.calls[1][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[1][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers.mock.calls[0][0]).toEqual(expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      }));
      expect(docker.getNetwork).toHaveBeenCalled();
      expect(docker.getNetwork).toHaveBeenCalledWith(networkName);
      expect(outputNetwork.inspect).toHaveBeenCalled();
      expect(error).toBeInstanceOf(FillDataRepositoryException);
      expect((<FillDataRepositoryException<EndpointSettings>>error).fillProperties).toEqual(expect.arrayContaining(<Array<keyof EndpointSettings>>['IPAddress']));
    });

    it(`Should error create container (don't retry)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([null, outputMystIdentityValid]);
      const convertLabelToObjectMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.getVolume.mockResolvedValue(<never>outputVolume);
      outputVolume.inspect.mockResolvedValue(outputVolumeInspect);
      docker.listContainers.mockResolvedValueOnce(outputEmptyCreatedContainerList);
      docker.getNetwork.mockResolvedValue(<never>outputNetwork);
      outputNetwork.inspect.mockResolvedValue(outputNetworkInspect);
      const executeError = new Error('Error on create container');
      docker.createContainer.mockRejectedValue(executeError);

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(2);
      expect(convertLabelToObjectMock.mock.calls[0][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['passphrase']));
      expect(docker.getVolume).toHaveBeenCalled();
      expect(docker.getVolume).toHaveBeenCalledWith(`myst-keystore-${outputMystIdentityValid.identity}`);
      expect(outputVolume.inspect).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectMock.mock.calls[1][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[1][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      });
      expect(docker.getNetwork).toHaveBeenCalled();
      expect(docker.getNetwork).toHaveBeenCalledWith(networkName);
      expect(outputNetwork.inspect).toHaveBeenCalled();
      expect(docker.createContainer).toHaveBeenCalled();
      expect(docker.createContainer).toHaveBeenCalledWith(expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.MYST,
        Labels: {
          [`${namespace}.project`]: RunnerServiceEnum.MYST,
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        },
        Env: expect.arrayContaining([
          `MYST_IDENTITY=${outputMystIdentityValid.identity}`,
          `"MYST_IDENTITY_PASS=${outputMystIdentityValid.passphrase}"`,
        ]),
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
            `myst-keystore-${outputMystIdentityValid.identity}:${mystDataVolume}`,
          ]),
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {
              IPAMConfig: {
                IPv4Address: '172.19.0.3',
              },
            },
          },
        },
      }));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container (don't retry) when start container`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([null, outputMystIdentityValid]);
      const convertLabelToObjectMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.getVolume.mockResolvedValue(<never>outputVolume);
      outputVolume.inspect.mockResolvedValue(outputVolumeInspect);
      docker.listContainers.mockResolvedValueOnce(outputEmptyCreatedContainerList);
      docker.getNetwork.mockResolvedValue(<never>outputNetwork);
      outputNetwork.inspect.mockResolvedValue(outputNetworkInspect);
      docker.createContainer.mockResolvedValue(<never>outputCreateContainer);
      const executeError = new Error('Error on create container');
      outputCreateContainer.start.mockRejectedValue(executeError);

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(3);
      expect(convertLabelToObjectMock.mock.calls[0][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['passphrase']));
      expect(docker.getVolume).toHaveBeenCalled();
      expect(docker.getVolume).toHaveBeenCalledWith(`myst-keystore-${outputMystIdentityValid.identity}`);
      expect(outputVolume.inspect).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalledTimes(2);
      expect(convertLabelToObjectMock.mock.calls[1][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[1][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      });
      expect(docker.getNetwork).toHaveBeenCalled();
      expect(docker.getNetwork).toHaveBeenCalledWith(networkName);
      expect(outputNetwork.inspect).toHaveBeenCalled();
      expect(docker.createContainer).toHaveBeenCalled();
      expect(docker.createContainer).toHaveBeenCalledWith(expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.MYST,
        Labels: {
          [`${namespace}.project`]: RunnerServiceEnum.MYST,
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        },
        Env: expect.arrayContaining([
          `MYST_IDENTITY=${outputMystIdentityValid.identity}`,
          `"MYST_IDENTITY_PASS=${outputMystIdentityValid.passphrase}"`,
        ]),
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
            `myst-keystore-${outputMystIdentityValid.identity}:${mystDataVolume}`,
          ]),
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {
              IPAMConfig: {
                IPv4Address: '172.19.0.3',
              },
            },
          },
        },
      }));
      expect(outputCreateContainer.start).toHaveBeenCalled();
      expect(convertLabelToObjectMock.mock.calls[1][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[1][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers.mock.calls[1][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      });
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully create container (don't retry)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([null, outputMystIdentityValid]);
      const convertLabelToObjectMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.getVolume.mockResolvedValue(<never>outputVolume);
      outputVolume.inspect.mockResolvedValue(outputVolumeInspect);
      docker.listContainers.mockResolvedValueOnce(outputEmptyCreatedContainerList);
      docker.getNetwork.mockResolvedValue(<never>outputNetwork);
      outputNetwork.inspect.mockResolvedValue(outputNetworkInspect);
      docker.createContainer.mockResolvedValue(<never>outputCreateContainer);
      outputCreateContainer.start.mockResolvedValue();
      (<jest.Mock>DockerLabelParser.convertObjectToLabel).mockReturnValue(<RunnerLabelNamespace<MystIdentityModel>>{
        $namespace: MystIdentityModel.name,
        id: outputMystIdentityValid.id,
        identity: outputMystIdentityValid.identity,
      });

      const [error, result] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(2);
      expect(convertLabelToObjectMock.mock.calls[0][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['passphrase']));
      expect(docker.getVolume).toHaveBeenCalled();
      expect(docker.getVolume).toHaveBeenCalledWith(`myst-keystore-${outputMystIdentityValid.identity}`);
      expect(outputVolume.inspect).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectMock.mock.calls[1][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[1][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      });
      expect(docker.getNetwork).toHaveBeenCalled();
      expect(docker.getNetwork).toHaveBeenCalledWith(networkName);
      expect(outputNetwork.inspect).toHaveBeenCalled();
      expect(docker.createContainer).toHaveBeenCalled();
      expect(docker.createContainer).toHaveBeenCalledWith(expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.MYST,
        Labels: {
          [`${namespace}.project`]: RunnerServiceEnum.MYST,
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        },
        Env: expect.arrayContaining([
          `MYST_IDENTITY=${outputMystIdentityValid.identity}`,
          `"MYST_IDENTITY_PASS=${outputMystIdentityValid.passphrase}"`,
        ]),
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
            `myst-keystore-${outputMystIdentityValid.identity}:${mystDataVolume}`,
          ]),
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {
              IPAMConfig: {
                IPv4Address: '172.19.0.3',
              },
            },
          },
        },
      }));
      expect(outputCreateContainer.start).toHaveBeenCalled();
      expect(DockerLabelParser.convertObjectToLabel).toHaveBeenCalled();
      expect(DockerLabelParser.convertObjectToLabel).toHaveBeenCalledWith(namespace, {
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
      });
      expect(error).toBeNull();
      expect(result).toMatchObject<RunnerModel<MystIdentityModel>>({
        id: identifierMock.generateId(),
        serial: outputCreateContainer.id,
        name: RunnerServiceEnum.MYST,
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: `172.19.0.3`,
        socketPort: httpPort,
        label: {
          $namespace: MystIdentityModel.name,
          id: outputMystIdentityValid.id,
          identity: outputMystIdentityValid.identity,
          passphrase: outputMystIdentityValid.passphrase,
        },
        volumes: expect.arrayContaining([
          {
            name: RunnerServiceVolumeEnum.MYST_KEYSTORE,
            source: inputRunner.volumes[0].source,
            dest: mystDataVolume,
          },
        ]),
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
    });

    it(`Should error create container (do retry)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([null, outputMystIdentityValid]);
      const convertLabelToObjectMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.getVolume.mockResolvedValue(<never>outputVolume);
      outputVolume.inspect.mockResolvedValue(outputVolumeInspect);
      docker.listContainers.mockResolvedValueOnce(outputEmptyCreatedContainerList);
      docker.getNetwork.mockResolvedValue(<never>outputNetwork);
      outputNetwork.inspect.mockResolvedValue(outputNetworkInspect);
      docker.listContainers.mockResolvedValueOnce(outputEmptyCreatedContainerList);
      docker.listContainers.mockResolvedValueOnce(outputEmptyCreatedContainerList);
      docker.createContainer.mockResolvedValue(<never>outputCreateContainer);
      const executeError = new Error('Error on create container');
      executeError['statusCode'] = 403;
      executeError['json'] = {message: 'Address already in use'};
      outputCreateContainer.start.mockRejectedValue(<never>executeError);
      (<jest.Mock>setTimeout).mockResolvedValue(null);

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(5);
      expect(convertLabelToObjectMock.mock.calls[0][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['passphrase']));
      expect(docker.getVolume).toHaveBeenCalled();
      expect(docker.getVolume).toHaveBeenCalledWith(`myst-keystore-${outputMystIdentityValid.identity}`);
      expect(outputVolume.inspect).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalledTimes(4);
      expect(convertLabelToObjectMock.mock.calls[1][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[1][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      });
      expect(convertLabelToObjectMock.mock.calls[2][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[2][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers.mock.calls[2][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      });
      expect(convertLabelToObjectMock.mock.calls[3][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[3][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers.mock.calls[3][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      });
      expect(docker.getNetwork).toHaveBeenCalledTimes(3);
      expect(docker.getNetwork).toHaveBeenCalledWith(networkName);
      expect(outputNetwork.inspect).toHaveBeenCalledTimes(3);
      expect(docker.createContainer).toHaveBeenCalledTimes(3);
      expect(docker.createContainer).toHaveBeenCalledWith(expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.MYST,
        Labels: {
          [`${namespace}.project`]: RunnerServiceEnum.MYST,
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        },
        Env: expect.arrayContaining([
          `MYST_IDENTITY=${outputMystIdentityValid.identity}`,
          `"MYST_IDENTITY_PASS=${outputMystIdentityValid.passphrase}"`,
        ]),
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
            `myst-keystore-${outputMystIdentityValid.identity}:${mystDataVolume}`,
          ]),
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {
              IPAMConfig: {
                IPv4Address: '172.19.0.3',
              },
            },
          },
        },
      }));
      expect(outputCreateContainer.start).toHaveBeenCalledTimes(3);
      expect(setTimeout).toHaveBeenCalledTimes(3);
      expect((<jest.Mock>setTimeout).mock.calls[0][0]).toEqual(expect.any(Number));
      expect((<jest.Mock>setTimeout).mock.calls[1][0]).toEqual(expect.any(Number));
      expect((<jest.Mock>setTimeout).mock.calls[2][0]).toEqual(expect.any(Number));
      expect(convertLabelToObjectMock.mock.calls[4][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[4][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create container (don't retry) when start container (error on list container for remove created container)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([null, outputMystIdentityValid]);
      const convertLabelToObjectMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.getVolume.mockResolvedValue(<never>outputVolume);
      outputVolume.inspect.mockResolvedValue(outputVolumeInspect);
      docker.listContainers.mockResolvedValueOnce(outputEmptyCreatedContainerList);
      docker.getNetwork.mockResolvedValue(<never>outputNetwork);
      outputNetwork.inspect.mockResolvedValue(outputNetworkInspect);
      docker.createContainer.mockResolvedValue(<never>outputCreateContainer);
      const executeError = new Error('Error on create container');
      outputCreateContainer.start.mockRejectedValue(executeError);
      const executeRemoveError = new Error('Error in get container');
      docker.listContainers.mockRejectedValueOnce(executeRemoveError);

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(3);
      expect(convertLabelToObjectMock.mock.calls[0][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['passphrase']));
      expect(docker.getVolume).toHaveBeenCalled();
      expect(docker.getVolume).toHaveBeenCalledWith(`myst-keystore-${outputMystIdentityValid.identity}`);
      expect(outputVolume.inspect).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalledTimes(2);
      expect(convertLabelToObjectMock.mock.calls[1][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[1][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      });
      expect(docker.getNetwork).toHaveBeenCalled();
      expect(docker.getNetwork).toHaveBeenCalledWith(networkName);
      expect(outputNetwork.inspect).toHaveBeenCalled();
      expect(docker.createContainer).toHaveBeenCalled();
      expect(docker.createContainer).toHaveBeenCalledWith(expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.MYST,
        Labels: {
          [`${namespace}.project`]: RunnerServiceEnum.MYST,
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        },
        Env: expect.arrayContaining([
          `MYST_IDENTITY=${outputMystIdentityValid.identity}`,
          `"MYST_IDENTITY_PASS=${outputMystIdentityValid.passphrase}"`,
        ]),
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
            `myst-keystore-${outputMystIdentityValid.identity}:${mystDataVolume}`,
          ]),
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {
              IPAMConfig: {
                IPv4Address: '172.19.0.3',
              },
            },
          },
        },
      }));
      expect(outputCreateContainer.start).toHaveBeenCalled();
      expect(convertLabelToObjectMock.mock.calls[2][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[2][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers.mock.calls[1][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      });
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container (don't retry) when start container (error on get container for remove created container)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([null, outputMystIdentityValid]);
      const convertLabelToObjectMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.getVolume.mockResolvedValue(<never>outputVolume);
      outputVolume.inspect.mockResolvedValue(outputVolumeInspect);
      docker.listContainers.mockResolvedValueOnce(outputEmptyCreatedContainerList);
      docker.getNetwork.mockResolvedValue(<never>outputNetwork);
      outputNetwork.inspect.mockResolvedValue(outputNetworkInspect);
      docker.createContainer.mockResolvedValue(<never>outputCreateContainer);
      const executeError = new Error('Error on create container');
      outputCreateContainer.start.mockRejectedValue(executeError);
      docker.listContainers.mockResolvedValueOnce(outputCreatedContainerList);
      const executeRemoveError = new Error('Error in get container');
      docker.getContainer.mockRejectedValueOnce(<never>executeRemoveError);

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(3);
      expect(convertLabelToObjectMock.mock.calls[0][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['passphrase']));
      expect(docker.getVolume).toHaveBeenCalled();
      expect(docker.getVolume).toHaveBeenCalledWith(`myst-keystore-${outputMystIdentityValid.identity}`);
      expect(outputVolume.inspect).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalledTimes(2);
      expect(convertLabelToObjectMock.mock.calls[1][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[1][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      });
      expect(docker.getNetwork).toHaveBeenCalled();
      expect(docker.getNetwork).toHaveBeenCalledWith(networkName);
      expect(outputNetwork.inspect).toHaveBeenCalled();
      expect(docker.createContainer).toHaveBeenCalled();
      expect(docker.createContainer).toHaveBeenCalledWith(expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.MYST,
        Labels: {
          [`${namespace}.project`]: RunnerServiceEnum.MYST,
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        },
        Env: expect.arrayContaining([
          `MYST_IDENTITY=${outputMystIdentityValid.identity}`,
          `"MYST_IDENTITY_PASS=${outputMystIdentityValid.passphrase}"`,
        ]),
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
            `myst-keystore-${outputMystIdentityValid.identity}:${mystDataVolume}`,
          ]),
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {
              IPAMConfig: {
                IPv4Address: '172.19.0.3',
              },
            },
          },
        },
      }));
      expect(outputCreateContainer.start).toHaveBeenCalled();
      expect(convertLabelToObjectMock.mock.calls[2][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[2][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers.mock.calls[1][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      });
      expect(docker.getContainer).toHaveBeenCalledTimes(1);
      expect(docker.getContainer.mock.calls[0][0]).toEqual(outputCreatedContainerList[0].Id);
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container (don't retry) when start container (error on remove created container)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([null, outputMystIdentityValid]);
      const convertLabelToObjectMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.getVolume.mockResolvedValue(<never>outputVolume);
      outputVolume.inspect.mockResolvedValue(outputVolumeInspect);
      docker.listContainers.mockResolvedValueOnce(outputEmptyCreatedContainerList);
      docker.getNetwork.mockResolvedValue(<never>outputNetwork);
      outputNetwork.inspect.mockResolvedValue(outputNetworkInspect);
      docker.createContainer.mockResolvedValue(<never>outputCreateContainer);
      const executeError = new Error('Error on create container');
      outputCreateContainer.start.mockRejectedValue(executeError);
      docker.listContainers.mockResolvedValueOnce(outputCreatedContainerList);
      docker.getContainer.mockResolvedValueOnce(<never>outputContainer);
      const executeRemoveError = new Error('Error on remove container');
      outputContainer.remove.mockRejectedValueOnce(<never>executeRemoveError);

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(3);
      expect(convertLabelToObjectMock.mock.calls[0][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['passphrase']));
      expect(docker.getVolume).toHaveBeenCalled();
      expect(docker.getVolume).toHaveBeenCalledWith(`myst-keystore-${outputMystIdentityValid.identity}`);
      expect(outputVolume.inspect).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalledTimes(2);
      expect(convertLabelToObjectMock.mock.calls[1][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[1][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      });
      expect(docker.getNetwork).toHaveBeenCalled();
      expect(docker.getNetwork).toHaveBeenCalledWith(networkName);
      expect(outputNetwork.inspect).toHaveBeenCalled();
      expect(docker.createContainer).toHaveBeenCalled();
      expect(docker.createContainer).toHaveBeenCalledWith(expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.MYST,
        Labels: {
          [`${namespace}.project`]: RunnerServiceEnum.MYST,
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        },
        Env: expect.arrayContaining([
          `MYST_IDENTITY=${outputMystIdentityValid.identity}`,
          `"MYST_IDENTITY_PASS=${outputMystIdentityValid.passphrase}"`,
        ]),
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
            `myst-keystore-${outputMystIdentityValid.identity}:${mystDataVolume}`,
          ]),
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {
              IPAMConfig: {
                IPv4Address: '172.19.0.3',
              },
            },
          },
        },
      }));
      expect(outputCreateContainer.start).toHaveBeenCalled();
      expect(convertLabelToObjectMock.mock.calls[2][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[2][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers.mock.calls[1][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      });
      expect(docker.getContainer).toHaveBeenCalledTimes(1);
      expect(docker.getContainer.mock.calls[0][0]).toEqual(outputCreatedContainerList[0].Id);
      expect(outputContainer.remove).toHaveBeenCalledTimes(1);
      expect(outputContainer.remove.mock.calls[0][0]).toEqual(expect.objectContaining({v: true, force: true}));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container (don't retry) when start container (successfully on remove created container)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn().mockReturnValue([null, outputMystIdentityValid]);
      const convertLabelToObjectMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.getVolume.mockResolvedValue(<never>outputVolume);
      outputVolume.inspect.mockResolvedValue(outputVolumeInspect);
      docker.listContainers.mockResolvedValueOnce(outputEmptyCreatedContainerList);
      docker.getNetwork.mockResolvedValue(<never>outputNetwork);
      outputNetwork.inspect.mockResolvedValue(outputNetworkInspect);
      docker.createContainer.mockResolvedValue(<never>outputCreateContainer);
      const executeError = new Error('Error on create container');
      outputCreateContainer.start.mockRejectedValue(executeError);
      docker.listContainers.mockResolvedValueOnce(outputCreatedContainerList);
      docker.getContainer.mockResolvedValueOnce(<never>outputContainer);
      outputContainer.remove.mockResolvedValueOnce();

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(3);
      expect(convertLabelToObjectMock.mock.calls[0][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['passphrase']));
      expect(docker.getVolume).toHaveBeenCalled();
      expect(docker.getVolume).toHaveBeenCalledWith(`myst-keystore-${outputMystIdentityValid.identity}`);
      expect(outputVolume.inspect).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalledTimes(2);
      expect(convertLabelToObjectMock.mock.calls[1][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[1][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      });
      expect(docker.getNetwork).toHaveBeenCalled();
      expect(docker.getNetwork).toHaveBeenCalledWith(networkName);
      expect(outputNetwork.inspect).toHaveBeenCalled();
      expect(docker.createContainer).toHaveBeenCalled();
      expect(docker.createContainer).toHaveBeenCalledWith(expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.MYST,
        Labels: {
          [`${namespace}.project`]: RunnerServiceEnum.MYST,
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        },
        Env: expect.arrayContaining([
          `MYST_IDENTITY=${outputMystIdentityValid.identity}`,
          `"MYST_IDENTITY_PASS=${outputMystIdentityValid.passphrase}"`,
        ]),
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
            `myst-keystore-${outputMystIdentityValid.identity}:${mystDataVolume}`,
          ]),
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {
              IPAMConfig: {
                IPv4Address: '172.19.0.3',
              },
            },
          },
        },
      }));
      expect(outputCreateContainer.start).toHaveBeenCalled();
      expect(convertLabelToObjectMock.mock.calls[2][0]).toEqual(namespace);
      expect(convertLabelToObjectMock.mock.calls[2][1]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['id', 'passphrase']));
      expect(docker.listContainers.mock.calls[1][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      });
      expect(docker.getContainer).toHaveBeenCalledTimes(1);
      expect(docker.getContainer.mock.calls[0][0]).toEqual(outputCreatedContainerList[0].Id);
      expect(outputContainer.remove).toHaveBeenCalledTimes(1);
      expect(outputContainer.remove.mock.calls[0][0]).toEqual(expect.objectContaining({v: true, force: true}));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });
  });
});
