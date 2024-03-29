import {DockerRunnerRepository} from './docker-runner.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {Test, TestingModule} from '@nestjs/testing';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {ICreateRunnerRepositoryInterface} from '@src-core/interface/i-create-runner-repository.interface';
import {DockerLabelParser} from '@src-infrastructure/utility/docker-label-parser';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import {
  RunnerExecEnum,
  RunnerLabelNamespace,
  RunnerModel,
  RunnerServiceEnum,
  RunnerServiceVolumeEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {FilterModel} from '@src-core/model/filter.model';
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import {defaultModelFactory, defaultModelType} from '@src-core/model/defaultModel';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {filterAndSortRunner} from '@src-infrastructure/utility/filterAndSortRunner';
import Dockerode from 'dockerode';
import Docker = require('dockerode');
import {UnknownException} from '@src-core/exception/unknown.exception';

jest.mock('@src-infrastructure/utility/docker-label-parser');
jest.mock('@src-infrastructure/utility/filterAndSortRunner');

describe('DockerRunnerRepository', () => {
  let repository: DockerRunnerRepository;
  let docker: MockProxy<Docker>;
  let dockerCreateStrategy: MockProxy<ICreateRunnerRepositoryInterface>;
  let identifierMock: MockProxy<IIdentifier>;
  let mystDataVolume: string;
  let envoyDefaultPort: number;
  let networkName: string;
  let realPath: string;
  let namespace: string;

  beforeEach(async () => {
    docker = mock<Docker>();
    dockerCreateStrategy = mock<ICreateRunnerRepositoryInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    mystDataVolume = '/var/lib/mysterium-node/keystore/';
    envoyDefaultPort = 10001;
    networkName = 'mysterium-proxy-api_main';
    realPath = '/real/path/';
    namespace = 'com.mysterium-proxy';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.DOCKER_DYNAMIC_MODULE,
          useValue: docker,
        },
        {
          provide: ProviderTokenEnum.DOCKER_RUNNER_CREATE_STRATEGY_REPOSITORY,
          useValue: dockerCreateStrategy,
        },
        {
          provide: DockerRunnerRepository,
          inject: [ProviderTokenEnum.DOCKER_DYNAMIC_MODULE, ProviderTokenEnum.DOCKER_RUNNER_CREATE_STRATEGY_REPOSITORY],
          useFactory: (docker: Docker, dockerCreateStrategy: ICreateRunnerRepositoryInterface) =>
            new DockerRunnerRepository(
              docker,
              dockerCreateStrategy,
              {
                networkName,
                defaultPort: {envoy: envoyDefaultPort},
                baseVolumePath: {myst: mystDataVolume},
                realPath,
              },
              namespace,
            ),
        },
      ],
    }).compile();

    repository = module.get<DockerRunnerRepository>(DockerRunnerRepository);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe(`Get all container`, () => {
    let inputLabelMystFilter: FilterModel<RunnerModel<MystIdentityModel>>;
    let inputLabelArrayFilter: FilterModel<RunnerModel<[MystIdentityModel, VpnProviderModel]>>;
    let outputMystIdentityValid: defaultModelType<MystIdentityModel>;
    let outputVpnProviderValid: defaultModelType<VpnProviderModel>;
    let outputDocker1: Dockerode.ContainerInfo;
    let outputDocker2: Dockerode.ContainerInfo;
    let outputRunnerFilter1: RunnerModel<MystIdentityModel>;
    let outputRunnerFilter2: RunnerModel<[MystIdentityModel, VpnProviderModel]>;

    beforeEach(() => {
      outputMystIdentityValid = defaultModelFactory<MystIdentityModel>(
        MystIdentityModel,
        {
          id: identifierMock.generateId(),
          identity: 'identity1',
          passphrase: 'passphrase1',
          path: 'default-path',
          filename: 'default-filename',
          isUse: false,
          insertDate: new Date(),
        },
        ['path', 'filename', 'isUse', 'insertDate'],
      );

      outputVpnProviderValid = defaultModelFactory<VpnProviderModel>(
        VpnProviderModel,
        {
          id: identifierMock.generateId(),
          userIdentity: 'identity1',
          serviceType: VpnServiceTypeEnum.WIREGUARD,
          providerName: VpnProviderName.MYSTERIUM,
          providerIdentity: 'provider-identity1',
          providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
          country: 'GB',
          isRegister: true,
          proxyCount: 1,
          insertDate: new Date(),
        },
        ['serviceType', 'providerName', 'providerIpType', 'providerIpType', 'country', 'isRegister', 'insertDate'],
      );

      inputLabelMystFilter = new FilterModel<RunnerModel<MystIdentityModel>>({});
      inputLabelMystFilter.addCondition({$opr: 'eq', name: 'container1'});
      inputLabelMystFilter.addCondition({$opr: 'eq', service: RunnerServiceEnum.MYST});
      inputLabelMystFilter.addCondition({
        $opr: 'eq',
        label: {$namespace: MystIdentityModel.name, identity: outputMystIdentityValid.identity},
      });

      inputLabelArrayFilter = new FilterModel<RunnerModel<[MystIdentityModel, VpnProviderModel]>>({});
      inputLabelArrayFilter.addCondition({
        $opr: 'eq',
        label: [
          {$namespace: MystIdentityModel.name, identity: 'identity1'},
          {
            $namespace: VpnProviderModel.name,
            userIdentity: outputVpnProviderValid.userIdentity,
            providerIdentity: outputVpnProviderValid.providerIdentity,
          },
        ],
      });

      outputDocker1 = {
        Id: 'container-id1',
        Names: [`/${RunnerServiceEnum.MYST}1`],
        Image: 'image-name:image-tag',
        ImageID: 'sha256:image-id',
        Command: '/bin/sh',
        Created: new Date().getTime() / 1000,
        Ports: [],
        Labels: {
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.MYST,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        },
        State: 'running',
        Status: 'Running',
        HostConfig: {NetworkMode: 'bridge'},
        NetworkSettings: {
          Networks: {
            [networkName]: {
              IPAMConfig: {
                IPv4Address: '10.101.0.2',
              },
              NetworkID: 'network-id',
              EndpointID: 'endpoint-id',
              Gateway: '10.101.0.1',
              IPAddress: '10.101.0.2',
              IPPrefixLen: 29,
              IPv6Gateway: '',
              GlobalIPv6Address: '',
              GlobalIPv6PrefixLen: 0,
              MacAddress: '02:42:0a:65:00:02',
            },
          },
        },
        Mounts: [
          {
            Type: 'bind',
            Source: '/etc/localtime',
            Destination: '/etc/localtime',
            Mode: 'ro',
            RW: false,
            Propagation: 'rprivate',
          },
          {
            Type: 'volume',
            Name: 'test-a',
            Source: '/home/docker/volumes/test-a/_data',
            Destination: `${mystDataVolume}/identity-1/`,
            Driver: 'local',
            Mode: 'z',
            RW: true,
            Propagation: '',
          },
        ],
      };
      outputDocker2 = {
        Id: 'container-id2',
        Names: [`/${RunnerServiceEnum.MYST_CONNECT}1`],
        Image: 'image-name:image-tag',
        ImageID: 'sha256:image-id',
        Command: '/bin/sh',
        Created: new Date().getTime() / 1000,
        Ports: [],
        Labels: {
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.MYST_CONNECT,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
          [`${namespace}.vpn-provider-model.user-identity`]: outputVpnProviderValid.userIdentity,
          [`${namespace}.vpn-provider-model.provider-identity`]: outputVpnProviderValid.providerIdentity,
        },
        State: 'created',
        Status: 'Created',
        HostConfig: {NetworkMode: 'container:container-id1'},
        NetworkSettings: {Networks: {}},
        Mounts: [],
      };

      outputRunnerFilter1 = new RunnerModel<MystIdentityModel>({
        id: outputDocker1.Labels[`${namespace}.id`],
        serial: outputDocker1.Id,
        name: outputDocker1.Names[0].replace(/^\/(.+)/, '$1'),
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: outputDocker1.NetworkSettings.Networks[networkName].IPAddress,
        socketPort: 4449,
        label: {
          $namespace: MystIdentityModel.name,
          id: outputMystIdentityValid.id,
          identity: outputMystIdentityValid.identity,
        },
        volumes: [
          {
            source: outputDocker1.Mounts[0].Source,
            dest: outputDocker1.Mounts[0].Destination,
          },
          {
            source: outputDocker1.Mounts[1].Source,
            dest: outputDocker1.Mounts[1].Destination,
            name: RunnerServiceVolumeEnum.MYST_KEYSTORE,
          },
        ],
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerFilter2 = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: outputDocker2.Labels[`${namespace}.id`],
        serial: outputDocker2.Id,
        name: outputDocker2.Names[0].replace(/^\/(.+)/, '$1'),
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.NONE,
        socketUri: outputDocker1.NetworkSettings.Networks[networkName].IPAddress,
        socketPort: null,
        volumes: [],
        status: RunnerStatusEnum.CREATING,
        insertDate: new Date(),
      });
      outputRunnerFilter2.label = [
        {
          $namespace: MystIdentityModel.name,
          id: outputMystIdentityValid.id,
          identity: outputMystIdentityValid.identity,
        },
        {
          $namespace: VpnProviderModel.name,
          id: outputVpnProviderValid.id,
          userIdentity: outputVpnProviderValid.userIdentity,
          providerIdentity: outputVpnProviderValid.providerIdentity,
        },
      ];
    });

    it(`Should error get all with one instance label when get invalid label`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([new FillDataRepositoryException<RunnerLabelNamespace<Object>>(['$namespace'])]);
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
        };
      });

      const [error] = await repository.getAll(inputLabelMystFilter);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(error).toBeInstanceOf(FillDataRepositoryException);
      expect((<FillDataRepositoryException<RunnerLabelNamespace<Object>>>error).fillProperties).toEqual(expect.arrayContaining(['$namespace']));
    });

    it(`Should error get all with one instance label when search it with myst identity model`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      const executeError = new Error('Error in get list of container');
      docker.listContainers.mockRejectedValue(executeError);

      const [error] = await repository.getAll(inputLabelMystFilter);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          name: [`/${inputLabelMystFilter.getCondition('name').name}`],
          label: [
            `${namespace}.create-by`,
            `${namespace}.project=${inputLabelMystFilter.getCondition('service').service}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      });
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error get all with multi instance label when search it with myst identity and vpn provider model`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        [`${namespace}.vpn-provider-model.user-identity`]: outputVpnProviderValid.userIdentity,
        [`${namespace}.vpn-provider-model.provider-identity`]: outputVpnProviderValid.providerIdentity,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      const executeError = new Error('Error in get list of container');
      docker.listContainers.mockRejectedValue(executeError);

      const [error] = await repository.getAll(inputLabelArrayFilter);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          name: [],
          label: [
            `${namespace}.create-by`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
            `${namespace}.vpn-provider-model.user-identity=${outputVpnProviderValid.userIdentity}`,
            `${namespace}.vpn-provider-model.provider-identity=${outputVpnProviderValid.providerIdentity}`,
          ],
        }),
      });
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error get all with multi instance label when search volume`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        [`${namespace}.vpn-provider-model.user-identity`]: outputVpnProviderValid.userIdentity,
        [`${namespace}.vpn-provider-model.provider-identity`]: outputVpnProviderValid.providerIdentity,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.listContainers.mockResolvedValue([]);
      const executeError = new Error('Error in get list of volume');
      docker.listVolumes.mockRejectedValue(executeError);

      const [error] = await repository.getAll(inputLabelArrayFilter);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          name: [],
          label: [
            `${namespace}.create-by`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
            `${namespace}.vpn-provider-model.user-identity=${outputVpnProviderValid.userIdentity}`,
            `${namespace}.vpn-provider-model.provider-identity=${outputVpnProviderValid.providerIdentity}`,
          ],
        }),
      });
      expect(docker.listVolumes).toHaveBeenCalled();
      expect(docker.listVolumes.mock.calls[0][0]).toEqual({
        filters: JSON.stringify({
          label: [`${namespace}.create-by`],
        }),
      });
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully get all and return empty array if not found any container`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.listContainers.mockResolvedValueOnce([]);


      const [error, result, total] = await repository.getAll(inputLabelMystFilter);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalledTimes(1);
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          name: [`/${inputLabelMystFilter.getCondition('name').name}`],
          label: [
            `${namespace}.create-by`,
            `${namespace}.project=${inputLabelMystFilter.getCondition('service').service}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      });
      expect(error).toBeNull();
      expect(result.length).toEqual(0);
      expect(total).toEqual(0);
    });

    it(`Should successfully get all`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          convertLabelToObject: convertLabelToObjectMock,
        };
      });
      docker.listContainers
        .mockResolvedValueOnce([outputDocker1, outputDocker2])
        .mockResolvedValueOnce([outputDocker1]);
      (<jest.Mock>filterAndSortRunner).mockReturnValue([[outputRunnerFilter1, outputRunnerFilter2], 2]);
      (<jest.Mock>DockerLabelParser.convertObjectToLabel)
        .mockReturnValueOnce(<RunnerLabelNamespace<MystIdentityModel>>{
          $namespace: MystIdentityModel.name,
          id: outputMystIdentityValid.id,
          identity: outputMystIdentityValid.identity,
        })
        .mockReturnValueOnce(<RunnerLabelNamespace<[MystIdentityModel, VpnProviderModel]>>[
          {
            $namespace: MystIdentityModel.name,
            id: outputMystIdentityValid.id,
            identity: outputMystIdentityValid.identity,
          },
          {
            $namespace: VpnProviderModel.name,
            id: outputVpnProviderValid.id,
            userIdentity: outputVpnProviderValid.userIdentity,
            providerIdentity: outputVpnProviderValid.providerIdentity,
          },
        ]);
      docker.listVolumes.mockResolvedValue({Volumes: [], Warnings: []});

      const [error, result, total] = await repository.getAll(inputLabelMystFilter);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalledTimes(2);
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          name: [`/${inputLabelMystFilter.getCondition('name').name}`],
          label: [
            `${namespace}.create-by`,
            `${namespace}.project=${inputLabelMystFilter.getCondition('service').service}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
            `${namespace}.myst-identity-model.identity=${outputMystIdentityValid.identity}`,
          ],
        }),
      });
      expect(docker.listContainers.mock.calls[1][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          id: [outputDocker1.Id],
          label: [`${namespace}.create-by`],
        }),
      });
      expect(docker.listVolumes).toHaveBeenCalled();
      expect(docker.listVolumes.mock.calls[0][0]).toEqual({
        filters: JSON.stringify({
          label: [`${namespace}.create-by`],
        }),
      });
      expect(DockerLabelParser.convertObjectToLabel).toHaveBeenCalledTimes(2);
      expect(filterAndSortRunner).toHaveBeenCalledWith(
        expect.arrayContaining([
          {
            id: outputDocker1.Labels[`${namespace}.id`],
            serial: outputDocker1.Id,
            name: outputDocker1.Names[0].replace(/^\/(.+)/, '$1'),
            service: RunnerServiceEnum.MYST,
            exec: RunnerExecEnum.DOCKER,
            socketType: RunnerSocketTypeEnum.HTTP,
            socketUri: outputDocker1.NetworkSettings.Networks[networkName].IPAddress,
            socketPort: 4449,
            label: {
              $namespace: MystIdentityModel.name,
              id: outputMystIdentityValid.id,
              identity: outputMystIdentityValid.identity,
            },
            volumes: [
              {
                source: outputDocker1.Mounts[0].Source,
                dest: outputDocker1.Mounts[0].Destination,
              },
              {
                source: outputDocker1.Mounts[1].Source,
                dest: outputDocker1.Mounts[1].Destination,
                name: RunnerServiceVolumeEnum.MYST_KEYSTORE,
              },
            ],
            status: RunnerStatusEnum.RUNNING,
            insertDate: new Date(),
          },
          {
            id: outputDocker2.Labels[`${namespace}.id`],
            serial: outputDocker2.Id,
            name: outputDocker2.Names[0].replace(/^\/(.+)/, '$1'),
            service: RunnerServiceEnum.MYST_CONNECT,
            exec: RunnerExecEnum.DOCKER,
            socketType: RunnerSocketTypeEnum.NONE,
            socketUri: outputDocker1.NetworkSettings.Networks[networkName].IPAddress,
            socketPort: null,
            label: [
              {
                $namespace: MystIdentityModel.name,
                id: outputMystIdentityValid.id,
                identity: outputMystIdentityValid.identity,
              },
              {
                $namespace: VpnProviderModel.name,
                id: outputVpnProviderValid.id,
                userIdentity: outputVpnProviderValid.userIdentity,
                providerIdentity: outputVpnProviderValid.providerIdentity,
              },
            ],
            volumes: [],
            status: RunnerStatusEnum.CREATING,
            insertDate: new Date(),
          },
        ]),
        expect.anything(),
      );
      expect(error).toBeNull();
      expect(result.length).toEqual(2);
      expect(total).toEqual(2);
    });
  });

  describe(`Get by id`, () => {
    let inputId: string;
    let outputMystIdentityValid: defaultModelType<MystIdentityModel>;
    let outputVpnProviderValid: defaultModelType<VpnProviderModel>;
    let outputDocker1: Dockerode.ContainerInfo;
    let outputDocker2: Dockerode.ContainerInfo;

    beforeEach(() => {
      inputId = identifierMock.generateId();

      outputMystIdentityValid = defaultModelFactory<MystIdentityModel>(
        MystIdentityModel,
        {
          id: identifierMock.generateId(),
          identity: 'identity1',
          passphrase: 'passphrase1',
          path: 'default-path',
          filename: 'default-filename',
          isUse: false,
          insertDate: new Date(),
        },
        ['path', 'filename', 'isUse', 'insertDate'],
      );

      outputVpnProviderValid = defaultModelFactory<VpnProviderModel>(
        VpnProviderModel,
        {
          id: identifierMock.generateId(),
          userIdentity: 'identity1',
          serviceType: VpnServiceTypeEnum.WIREGUARD,
          providerName: VpnProviderName.MYSTERIUM,
          providerIdentity: 'provider-identity1',
          providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
          country: 'GB',
          isRegister: true,
          proxyCount: 1,
          insertDate: new Date(),
        },
        ['serviceType', 'providerName', 'providerIpType', 'providerIpType', 'country', 'isRegister', 'insertDate'],
      );

      outputDocker1 = {
        Id: 'container-id1',
        Names: [`/${RunnerServiceEnum.MYST}1`],
        Image: 'image-name:image-tag',
        ImageID: 'sha256:image-id',
        Command: '/bin/sh',
        Created: new Date().getTime() / 1000,
        Ports: [],
        Labels: {
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.MYST,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
        },
        State: 'running',
        Status: 'Running',
        HostConfig: {NetworkMode: 'bridge'},
        NetworkSettings: {
          Networks: {
            [networkName]: {
              IPAMConfig: {
                IPv4Address: '10.101.0.2',
              },
              NetworkID: 'network-id',
              EndpointID: 'endpoint-id',
              Gateway: '10.101.0.1',
              IPAddress: '10.101.0.2',
              IPPrefixLen: 29,
              IPv6Gateway: '',
              GlobalIPv6Address: '',
              GlobalIPv6PrefixLen: 0,
              MacAddress: '02:42:0a:65:00:02',
            },
          },
        },
        Mounts: [
          {
            Type: 'bind',
            Source: '/etc/localtime',
            Destination: '/etc/localtime',
            Mode: 'ro',
            RW: false,
            Propagation: 'rprivate',
          },
          {
            Type: 'volume',
            Name: 'test-a',
            Source: '/home/docker/volumes/test-a/_data',
            Destination: `${mystDataVolume}/identity-1/`,
            Driver: 'local',
            Mode: 'z',
            RW: true,
            Propagation: '',
          },
        ],
      };
      outputDocker2 = {
        Id: 'container-id2',
        Names: [`/${RunnerServiceEnum.MYST_CONNECT}1`],
        Image: 'image-name:image-tag',
        ImageID: 'sha256:image-id',
        Command: '/bin/sh',
        Created: new Date().getTime() / 1000,
        Ports: [],
        Labels: {
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.MYST_CONNECT,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
          [`${namespace}.vpn-provider-model.user-identity`]: outputVpnProviderValid.userIdentity,
          [`${namespace}.vpn-provider-model.provider-identity`]: outputVpnProviderValid.providerIdentity,
        },
        State: 'created',
        Status: 'Created',
        HostConfig: {NetworkMode: 'container:container-id1'},
        NetworkSettings: {Networks: {}},
        Mounts: [],
      };
    });

    it(`Should error get by id when fetch container lists`, async () => {
      const executeError = new Error('Error in get list of container');
      docker.listContainers.mockRejectedValue(executeError);

      const [error] = await repository.getById(inputId);

      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error get by id when fetch volume lists`, async () => {
      docker.listContainers.mockResolvedValue([]);
      const executeError = new Error('Error in get list of container');
      docker.listVolumes.mockRejectedValue(executeError);

      const [error] = await repository.getById(inputId);

      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(docker.listVolumes).toHaveBeenCalled();
      expect(docker.listVolumes.mock.calls[0][0]).toEqual({
        filters: JSON.stringify({
          label: [`${namespace}.create-by`],
        }),
      });
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully get by id and return null if not found any container with id`, async () => {
      docker.listContainers.mockResolvedValueOnce([]);

      const [error, result] = await repository.getById(inputId);

      expect(docker.listContainers).toHaveBeenCalledTimes(1);
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should successfully get by id`, async () => {
      docker.listContainers
        .mockResolvedValueOnce([outputDocker2])
        .mockResolvedValueOnce([outputDocker1]);
      (<jest.Mock>DockerLabelParser.convertObjectToLabel)
        .mockReturnValueOnce(<RunnerLabelNamespace<[MystIdentityModel, VpnProviderModel]>>[
          {
            $namespace: MystIdentityModel.name,
            id: outputMystIdentityValid.id,
            identity: outputMystIdentityValid.identity,
          },
          {
            $namespace: VpnProviderModel.name,
            id: outputVpnProviderValid.id,
            userIdentity: outputVpnProviderValid.userIdentity,
            providerIdentity: outputVpnProviderValid.providerIdentity,
          },
        ]);
      docker.listVolumes.mockResolvedValue({Volumes: [], Warnings: []});

      const [error, result] = await repository.getById(inputId);

      expect(docker.listContainers).toHaveBeenCalledTimes(2);
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(docker.listContainers.mock.calls[1][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          id: [outputDocker1.Id],
          label: [`${namespace}.create-by`],
        }),
      });
      expect(docker.listVolumes).toHaveBeenCalled();
      expect(docker.listVolumes.mock.calls[0][0]).toEqual({
        filters: JSON.stringify({
          label: [`${namespace}.create-by`],
        }),
      });
      expect(error).toBeNull();
      expect(result).toEqual({
        id: outputDocker2.Labels[`${namespace}.id`],
        serial: outputDocker2.Id,
        name: outputDocker2.Names[0].replace(/^\/(.+)/, '$1'),
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.NONE,
        socketUri: outputDocker1.NetworkSettings.Networks[networkName].IPAddress,
        socketPort: null,
        label: [
          {
            $namespace: MystIdentityModel.name,
            id: outputMystIdentityValid.id,
            identity: outputMystIdentityValid.identity,
          },
          {
            $namespace: VpnProviderModel.name,
            id: outputVpnProviderValid.id,
            userIdentity: outputVpnProviderValid.userIdentity,
            providerIdentity: outputVpnProviderValid.providerIdentity,
          },
        ],
        volumes: [],
        status: RunnerStatusEnum.CREATING,
        insertDate: new Date(),
      });
    });
  });

  describe(`Create container`, () => {
    let inputRunner: RunnerModel<MystIdentityModel>;
    let outputRunner: RunnerModel<MystIdentityModel>;

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

      outputRunner = new RunnerModel<MystIdentityModel>({
        id: identifierMock.generateId(),
        serial: 'serial',
        name: `${RunnerServiceEnum.MYST}1`,
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.NONE,
        status: RunnerStatusEnum.CREATING,
        insertDate: new Date(),
      });
    });

    it(`Should error create myst container`, async () => {
      dockerCreateStrategy.create.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.create(inputRunner);

      expect(dockerCreateStrategy.create).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create myst container`, async () => {
      dockerCreateStrategy.create.mockResolvedValue([null, outputRunner]);

      const [error, result] = await repository.create(inputRunner);

      expect(dockerCreateStrategy.create).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toBeInstanceOf(RunnerModel);
    });
  });

  describe(`Restart container`, () => {
    let inputId: string;
    let outputDocker1: Dockerode.ContainerInfo;
    let outputContainer: { restart: any };

    beforeEach(() => {
      inputId = identifierMock.generateId();

      outputDocker1 = {
        Id: 'container-id1',
        Names: [`/${RunnerServiceEnum.MYST}1`],
        Image: 'image-name:image-tag',
        ImageID: 'sha256:image-id',
        Command: '/bin/sh',
        Created: new Date().getTime() / 1000,
        Ports: [],
        Labels: {},
        State: 'running',
        Status: 'Running',
        HostConfig: {NetworkMode: 'bridge'},
        NetworkSettings: {
          Networks: {
            [networkName]: {
              IPAMConfig: {
                IPv4Address: '10.101.0.2',
              },
              NetworkID: 'network-id',
              EndpointID: 'endpoint-id',
              Gateway: '10.101.0.1',
              IPAddress: '10.101.0.2',
              IPPrefixLen: 29,
              IPv6Gateway: '',
              GlobalIPv6Address: '',
              GlobalIPv6PrefixLen: 0,
              MacAddress: '02:42:0a:65:00:02',
            },
          },
        },
        Mounts: [
          {
            Type: 'bind',
            Source: '/etc/localtime',
            Destination: '/etc/localtime',
            Mode: 'ro',
            RW: false,
            Propagation: 'rprivate',
          },
          {
            Type: 'volume',
            Name: 'test-a',
            Source: '/home/docker/volumes/test-a/_data',
            Destination: `${mystDataVolume}/identity-1/`,
            Driver: 'local',
            Mode: 'z',
            RW: true,
            Propagation: '',
          },
        ],
      };

      outputContainer = {restart: jest.fn()};
    });

    it(`Should error restart container when get list of container`, async () => {
      const executeError = new Error('Error in get list of container');
      docker.listContainers.mockRejectedValue(executeError);

      const [error] = await repository.restart(inputId);

      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully restart container and return null if not found container`, async () => {
      docker.listContainers.mockResolvedValue([]);

      const [error, result] = await repository.restart(inputId);

      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should error restart container when get container`, async () => {
      docker.listContainers.mockResolvedValue([outputDocker1]);
      const executeError = new Error('Error in get container');
      docker.getContainer.mockRejectedValue(<never>executeError);

      const [error] = await repository.restart(inputId);

      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(docker.getContainer).toHaveBeenCalled();
      expect(docker.getContainer).toHaveBeenCalledWith(outputDocker1.Id);
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error restart container when restart container`, async () => {
      docker.listContainers.mockResolvedValue([outputDocker1]);
      docker.getContainer.mockResolvedValue(<never>outputContainer);
      const executeError = new Error('Error in restart container');
      outputContainer.restart.mockRejectedValue(executeError);

      const [error] = await repository.restart(inputId);

      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(docker.getContainer).toHaveBeenCalled();
      expect(docker.getContainer).toHaveBeenCalledWith(outputDocker1.Id);
      expect(outputContainer.restart).toHaveBeenCalled();
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully restart container`, async () => {
      docker.listContainers.mockResolvedValue([outputDocker1]);
      docker.getContainer.mockResolvedValue(<never>outputContainer);
      outputContainer.restart.mockResolvedValue();

      const [error, result] = await repository.restart(inputId);

      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(docker.getContainer).toHaveBeenCalled();
      expect(docker.getContainer).toHaveBeenCalledWith(outputDocker1.Id);
      expect(outputContainer.restart).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });

  describe(`Reload container`, () => {
    let inputId: string;
    let outputDocker1: Dockerode.ContainerInfo;
    let outputContainer: { kill: any };

    beforeEach(() => {
      inputId = identifierMock.generateId();

      outputDocker1 = {
        Id: 'container-id1',
        Names: [`/${RunnerServiceEnum.MYST}1`],
        Image: 'image-name:image-tag',
        ImageID: 'sha256:image-id',
        Command: '/bin/sh',
        Created: new Date().getTime() / 1000,
        Ports: [],
        Labels: {},
        State: 'running',
        Status: 'Running',
        HostConfig: {NetworkMode: 'bridge'},
        NetworkSettings: {
          Networks: {
            [networkName]: {
              IPAMConfig: {
                IPv4Address: '10.101.0.2',
              },
              NetworkID: 'network-id',
              EndpointID: 'endpoint-id',
              Gateway: '10.101.0.1',
              IPAddress: '10.101.0.2',
              IPPrefixLen: 29,
              IPv6Gateway: '',
              GlobalIPv6Address: '',
              GlobalIPv6PrefixLen: 0,
              MacAddress: '02:42:0a:65:00:02',
            },
          },
        },
        Mounts: [
          {
            Type: 'bind',
            Source: '/etc/localtime',
            Destination: '/etc/localtime',
            Mode: 'ro',
            RW: false,
            Propagation: 'rprivate',
          },
          {
            Type: 'volume',
            Name: 'test-a',
            Source: '/home/docker/volumes/test-a/_data',
            Destination: `${mystDataVolume}/identity-1/`,
            Driver: 'local',
            Mode: 'z',
            RW: true,
            Propagation: '',
          },
        ],
      };

      outputContainer = {kill: jest.fn()};
    });

    it(`Should error reload container when get list of container`, async () => {
      const executeError = new Error('Error in get list of container');
      docker.listContainers.mockRejectedValue(executeError);

      const [error] = await repository.reload(inputId);

      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully reload container and return null if not found container`, async () => {
      docker.listContainers.mockResolvedValue([]);

      const [error, result] = await repository.reload(inputId);

      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should error reload container when get container`, async () => {
      docker.listContainers.mockResolvedValue([outputDocker1]);
      const executeError = new Error('Error in get container');
      docker.getContainer.mockRejectedValue(<never>executeError);

      const [error] = await repository.reload(inputId);

      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(docker.getContainer).toHaveBeenCalled();
      expect(docker.getContainer).toHaveBeenCalledWith(outputDocker1.Id);
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error reload container when reload container`, async () => {
      docker.listContainers.mockResolvedValue([outputDocker1]);
      docker.getContainer.mockResolvedValue(<never>outputContainer);
      const executeError = new Error('Error in reload container');
      outputContainer.kill.mockRejectedValue(executeError);

      const [error] = await repository.reload(inputId);

      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(docker.getContainer).toHaveBeenCalled();
      expect(docker.getContainer).toHaveBeenCalledWith(outputDocker1.Id);
      expect(outputContainer.kill).toHaveBeenCalled();
      expect(outputContainer.kill).toHaveBeenCalledWith(expect.objectContaining({signal: 'HUP'}));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully reload container`, async () => {
      docker.listContainers.mockResolvedValue([outputDocker1]);
      docker.getContainer.mockResolvedValue(<never>outputContainer);
      outputContainer.kill.mockResolvedValue();

      const [error, result] = await repository.reload(inputId);

      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(docker.getContainer).toHaveBeenCalled();
      expect(docker.getContainer).toHaveBeenCalledWith(outputDocker1.Id);
      expect(outputContainer.kill).toHaveBeenCalled();
      expect(outputContainer.kill).toHaveBeenCalledWith(expect.objectContaining({signal: 'HUP'}));
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });

  describe(`Remove container`, () => {
    let inputId: string;
    let outputDocker1: Dockerode.ContainerInfo;
    let outputContainer: { remove: any };

    beforeEach(() => {
      inputId = identifierMock.generateId();

      outputDocker1 = {
        Id: 'container-id1',
        Names: [`/${RunnerServiceEnum.MYST}1`],
        Image: 'image-name:image-tag',
        ImageID: 'sha256:image-id',
        Command: '/bin/sh',
        Created: new Date().getTime() / 1000,
        Ports: [],
        Labels: {},
        State: 'running',
        Status: 'Running',
        HostConfig: {NetworkMode: 'bridge'},
        NetworkSettings: {
          Networks: {
            [networkName]: {
              IPAMConfig: {
                IPv4Address: '10.101.0.2',
              },
              NetworkID: 'network-id',
              EndpointID: 'endpoint-id',
              Gateway: '10.101.0.1',
              IPAddress: '10.101.0.2',
              IPPrefixLen: 29,
              IPv6Gateway: '',
              GlobalIPv6Address: '',
              GlobalIPv6PrefixLen: 0,
              MacAddress: '02:42:0a:65:00:02',
            },
          },
        },
        Mounts: [
          {
            Type: 'bind',
            Source: '/etc/localtime',
            Destination: '/etc/localtime',
            Mode: 'ro',
            RW: false,
            Propagation: 'rprivate',
          },
          {
            Type: 'volume',
            Name: 'test-a',
            Source: '/home/docker/volumes/test-a/_data',
            Destination: `${mystDataVolume}/identity-1/`,
            Driver: 'local',
            Mode: 'z',
            RW: true,
            Propagation: '',
          },
        ],
      };

      outputContainer = {remove: jest.fn()};
    });

    it(`Should error remove container when get list of container`, async () => {
      const executeError = new Error('Error in get list of container');
      docker.listContainers.mockRejectedValue(executeError);

      const [error] = await repository.remove(inputId);

      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully remove container and return null if not found container`, async () => {
      docker.listContainers.mockResolvedValue([]);

      const [error, result] = await repository.remove(inputId);

      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should error remove container when get container`, async () => {
      docker.listContainers.mockResolvedValue([outputDocker1]);
      const executeError = new Error('Error in get container');
      docker.getContainer.mockRejectedValue(<never>executeError);

      const [error] = await repository.remove(inputId);

      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(docker.getContainer).toHaveBeenCalled();
      expect(docker.getContainer).toHaveBeenCalledWith(outputDocker1.Id);
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error remove container when remove container`, async () => {
      docker.listContainers.mockResolvedValue([outputDocker1]);
      docker.getContainer.mockResolvedValue(<never>outputContainer);
      const executeError = new Error('Error in reload container');
      outputContainer.remove.mockRejectedValue(executeError);

      const [error] = await repository.remove(inputId);

      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(docker.getContainer).toHaveBeenCalled();
      expect(docker.getContainer).toHaveBeenCalledWith(outputDocker1.Id);
      expect(outputContainer.remove).toHaveBeenCalled();
      expect(outputContainer.remove).toHaveBeenCalledWith(expect.objectContaining({v: true, force: true}));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully remove container`, async () => {
      docker.listContainers.mockResolvedValue([outputDocker1]);
      docker.getContainer.mockResolvedValue(<never>outputContainer);
      outputContainer.remove.mockResolvedValue();

      const [error, result] = await repository.remove(inputId);

      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers.mock.calls[0][0]).toEqual({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.create-by`,
            `${namespace}.id=${inputId}`,
          ],
        }),
      });
      expect(docker.getContainer).toHaveBeenCalled();
      expect(docker.getContainer).toHaveBeenCalledWith(outputDocker1.Id);
      expect(outputContainer.remove).toHaveBeenCalled();
      expect(outputContainer.remove).toHaveBeenCalledWith(expect.objectContaining({v: true, force: true}));
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });
});
