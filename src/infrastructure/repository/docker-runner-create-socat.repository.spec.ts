import {DockerRunnerCreateSocatRepository} from './docker-runner-create-socat.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import Docker = require('dockerode');
import {
  RunnerExecEnum, RunnerLabelNamespace,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {Test, TestingModule} from '@nestjs/testing';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import {defaultModelFactory, defaultModelType} from '@src-core/model/defaultModel';
import Dockerode, {ContainerInspectInfo} from 'dockerode';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import {DockerLabelParser} from '@src-infrastructure/utility/docker-label-parser';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {NotRunningServiceException} from '@src-core/exception/not-running-service.exception';
import {PortInUseException} from '@src-core/exception/port-in-use.exception';
import {setTimeout} from 'timers/promises';
import {UnknownException} from '@src-core/exception/unknown.exception';

jest.mock('@src-infrastructure/utility/docker-label-parser');
jest.mock('timers/promises');

describe('DockerRunnerCreateSocatRepository', () => {
  let repository: DockerRunnerCreateSocatRepository;
  let docker: MockProxy<Docker>;
  let identifierMock: MockProxy<IIdentifier>;
  let imageName: string;
  let envoyDefaultPort: number;
  let networkName: string;
  let startPortBinding: number;
  let namespace: string;

  beforeEach(async () => {
    docker = mock<Docker>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    imageName = 'mysterium-proxy-api-socat';
    envoyDefaultPort = 10001;
    networkName = 'mysterium-proxy-api_main';
    startPortBinding = 8080;
    namespace = 'com.mysterium-proxy';

    const dockerProvider = 'docker-runner-repository';
    const identifierMockProvider = 'identifier';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: dockerProvider,
          useValue: docker,
        },
        {
          provide: identifierMockProvider,
          useValue: identifierMock,
        },
        {
          provide: DockerRunnerCreateSocatRepository,
          inject: [dockerProvider, identifierMockProvider],
          useFactory: (docker: Docker, identifierMock: IIdentifier) =>
            new DockerRunnerCreateSocatRepository(
              docker,
              identifierMock,
              {
                imageName,
                envoyDefaultPort,
                networkName,
              },
              startPortBinding,
              namespace,
            ),
        },
      ],
    }).compile();

    repository = module.get<DockerRunnerCreateSocatRepository>(DockerRunnerCreateSocatRepository);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it(`should be defined`, () => {
    expect(repository).toBeDefined();
  });

  it(`should be socat service type`, () => {
    expect(repository.serviceType).toEqual(RunnerServiceEnum.SOCAT);
  });

  describe(`Create socat container`, () => {
    let inputRunnerWithPort: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>;
    let inputRunnerWithoutPort: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>;
    let outputMystIdentityInvalid: defaultModelType<MystIdentityModel>;
    let outputMystIdentityValid: defaultModelType<MystIdentityModel>;
    let outputVpnProviderInvalid: defaultModelType<VpnProviderModel>;
    let outputVpnProviderValid: defaultModelType<VpnProviderModel>;
    let outputProxyUpstreamInvalid: defaultModelType<ProxyUpstreamModel>;
    let outputProxyUpstreamValid: defaultModelType<ProxyUpstreamModel>;
    let outputEmptyContainerList: Array<Dockerode.ContainerInfo>;
    let outputExistContainerList: Array<Dockerode.ContainerInfo>;
    let outputCreatedContainer1: Dockerode.ContainerInfo;
    let outputFailedWithPortUsingContainer: { inspect: any, remove: any };
    let outputInspectFailedWithPortUsingContainer: Pick<ContainerInspectInfo, 'State'>;
    let outputContainerBindPort1: Dockerode.ContainerInfo;
    let outputContainerBindPort2: Dockerode.ContainerInfo;
    let outputContainerBindPort3: Dockerode.ContainerInfo;
    let outputCreateContainer: { id: string, start: any };

    beforeEach(() => {
      inputRunnerWithPort = defaultModelFactory<RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>>(
        RunnerModel,
        {
          id: 'default-id',
          serial: 'default-serial',
          name: 'socat',
          service: RunnerServiceEnum.SOCAT,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.TCP,
          socketPort: 3128,
          label: [
            {
              $namespace: MystIdentityModel.name,
              id: '11111111-1111-1111-1111-222222222222',
            },
            {
              $namespace: VpnProviderModel.name,
              id: '11111111-1111-1111-1111-333333333333',
            },
            {
              $namespace: ProxyUpstreamModel.name,
              id: '11111111-1111-1111-1111-444444444444',
            },
          ],
          status: RunnerStatusEnum.CREATING,
          insertDate: new Date(),
        },
        ['id', 'serial', 'status', 'insertDate'],
      );

      inputRunnerWithoutPort = defaultModelFactory<RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>>(
        RunnerModel,
        {
          id: 'default-id',
          serial: 'default-serial',
          name: 'socat',
          service: RunnerServiceEnum.SOCAT,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.TCP,
          label: [
            {
              $namespace: MystIdentityModel.name,
              id: '11111111-1111-1111-1111-222222222222',
            },
            {
              $namespace: VpnProviderModel.name,
              id: '11111111-1111-1111-1111-333333333333',
            },
            {
              $namespace: ProxyUpstreamModel.name,
              id: '11111111-1111-1111-1111-444444444444',
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
          passphrase: 'default-passphrase',
          path: 'default-path',
          filename: 'default-filename',
          isUse: false,
          insertDate: new Date(),
        },
        ['id', 'identity', 'passphrase', 'path', 'filename', 'isUse', 'insertDate'],
      );
      outputMystIdentityValid = defaultModelFactory<MystIdentityModel>(
        MystIdentityModel,
        {
          id: inputRunnerWithPort.label.find((v) => v.$namespace === MystIdentityModel.name).id,
          identity: 'default-identity',
          passphrase: 'default-passphrase',
          path: 'default-path',
          filename: 'default-filename',
          isUse: false,
          insertDate: new Date(),
        },
        ['identity', 'passphrase', 'path', 'filename', 'isUse', 'insertDate'],
      );

      outputVpnProviderInvalid = defaultModelFactory<VpnProviderModel>(
        VpnProviderModel,
        {
          id: 'default-id',
          userIdentity: 'default-user-identity',
          serviceType: VpnServiceTypeEnum.WIREGUARD,
          providerName: VpnProviderName.MYSTERIUM,
          providerIdentity: 'default-provider-identity',
          providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
          country: 'default-country',
          isRegister: false,
          proxyCount: 0,
          insertDate: new Date(),
        },
        ['id', 'userIdentity', 'providerIdentity', 'serviceType', 'providerName', 'providerIpType', 'country', 'isRegister', 'proxyCount', 'insertDate'],
      );
      outputVpnProviderValid = defaultModelFactory<VpnProviderModel>(
        VpnProviderModel,
        {
          id: inputRunnerWithPort.label.find((v) => v.$namespace === VpnProviderModel.name).id,
          userIdentity: 'default-user-identity',
          serviceType: VpnServiceTypeEnum.WIREGUARD,
          providerName: VpnProviderName.MYSTERIUM,
          providerIdentity: 'default-provider-identity',
          providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
          country: 'default-country',
          isRegister: false,
          proxyCount: 0,
          insertDate: new Date(),
        },
        ['userIdentity', 'providerIdentity', 'serviceType', 'providerName', 'providerIpType', 'country', 'isRegister', 'proxyCount', 'insertDate'],
      );

      outputProxyUpstreamInvalid = defaultModelFactory<ProxyUpstreamModel>(
        ProxyUpstreamModel,
        {
          id: 'default-id',
          listenAddr: 'default-listen-addr',
          listenPort: 3128,
          proxyDownstream: [],
          insertDate: new Date(),
        },
        ['id', 'listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
      );
      outputProxyUpstreamValid = defaultModelFactory<ProxyUpstreamModel>(
        ProxyUpstreamModel,
        {
          id: inputRunnerWithPort.label.find((v) => v.$namespace === ProxyUpstreamModel.name).id,
          listenAddr: 'default-listen-addr',
          listenPort: 3128,
          proxyDownstream: [],
          insertDate: new Date(),
        },
        ['listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
      );

      outputEmptyContainerList = [];
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
          NetworkSettings: {
            Networks: {
              [networkName]: {
                NetworkID: '7ea29fc1412292a2d7bba362f9253545fecdfa8ce9a6e37dd10ba8bee7129812',
                EndpointID: '2cdc4edb1ded3631c81f57966563e5c8525b81121bb3706a9a9a3ae102711f3f',
                Gateway: '172.17.0.1',
                IPAddress: '172.17.0.2',
                IPPrefixLen: 16,
                IPv6Gateway: '',
                GlobalIPv6Address: '',
                GlobalIPv6PrefixLen: 0,
                MacAddress: '02:42:ac:11:00:02',
              },
            },
          },
          Mounts: [],
        },
      ];

      outputCreatedContainer1 = {
        Id: 'container-id2',
        Names: [`/${inputRunnerWithPort.name}`],
        Image: 'image-name:image-tag',
        ImageID: 'sha256:image-id',
        Command: '/bin/sh',
        Created: 1665472068,
        Ports: [
          {
            IP: '0.0.0.0',
            PrivatePort: 1234,
            PublicPort: inputRunnerWithPort.socketPort,
            Type: 'tcp',
          },
        ],
        Labels: {
          [`${namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${namespace}.publish-port`]: inputRunnerWithPort.socketPort.toString(),
        },
        State: 'created',
        Status: 'Created',
        HostConfig: {NetworkMode: 'bridge'},
        NetworkSettings: {
          Networks: {
            [networkName]: {
              NetworkID: '7ea29fc1412292a2d7bba362f9253545fecdfa8ce9a6e37dd10ba8bee7129812',
              EndpointID: '2cdc4edb1ded3631c81f57966563e5c8525b81121bb3706a9a9a3ae102711f3f',
              Gateway: '172.17.0.1',
              IPAddress: '172.17.0.2',
              IPPrefixLen: 16,
              IPv6Gateway: '',
              GlobalIPv6Address: '',
              GlobalIPv6PrefixLen: 0,
              MacAddress: '02:42:ac:11:00:02',
            },
          },
        },
        Mounts: [],
      };

      outputFailedWithPortUsingContainer = {inspect: jest.fn(), remove: jest.fn()};
      outputInspectFailedWithPortUsingContainer = {
        State: {
          Status: 'created',
          Running: false,
          Paused: false,
          Restarting: false,
          OOMKilled: false,
          Dead: false,
          Pid: 0,
          ExitCode: 128,
          Error: 'driver failed programming external connectivity on endpoint test2 (71b730dc2b4deef1f7a9608c9ee00c20d81e359d780a731aa604cb4287534e25): Bind for 0.0.0.0:8000 failed: port is already allocated',
          StartedAt: '0001-01-01T00:00:00Z',
          FinishedAt: '0001-01-01T00:00:00Z',
        },
      };

      outputContainerBindPort1 = {
        Id: 'container-id2',
        Names: [`/${RunnerServiceEnum.SOCAT}1`],
        Image: 'image-name:image-tag',
        ImageID: 'sha256:image-id',
        Command: '/bin/sh',
        Created: 1665472068,
        Ports: [],
        Labels: {
          [`${namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${namespace}.publish-port`]: '8080',
        },
        State: 'running',
        Status: 'Running',
        HostConfig: {NetworkMode: 'bridge'},
        NetworkSettings: {
          Networks: {
            [networkName]: {
              NetworkID: '7ea29fc1412292a2d7bba362f9253545fecdfa8ce9a6e37dd10ba8bee7129812',
              EndpointID: '2cdc4edb1ded3631c81f57966563e5c8525b81121bb3706a9a9a3ae102711f3f',
              Gateway: '172.17.0.1',
              IPAddress: '172.17.0.2',
              IPPrefixLen: 16,
              IPv6Gateway: '',
              GlobalIPv6Address: '',
              GlobalIPv6PrefixLen: 0,
              MacAddress: '02:42:ac:11:00:02',
            },
          },
        },
        Mounts: [],
      };
      outputContainerBindPort2 = {
        Id: 'container-id3',
        Names: [`/${RunnerServiceEnum.SOCAT}2`],
        Image: 'image-name:image-tag',
        ImageID: 'sha256:image-id',
        Command: '/bin/sh',
        Created: 1665472068,
        Ports: [],
        Labels: {
          [`${namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${namespace}.publish-port`]: '8081',
        },
        State: 'created',
        Status: 'Created',
        HostConfig: {NetworkMode: 'bridge'},
        NetworkSettings: {
          Networks: {
            [networkName]: {
              NetworkID: '7ea29fc1412292a2d7bba362f9253545fecdfa8ce9a6e37dd10ba8bee7129812',
              EndpointID: '2cdc4edb1ded3631c81f57966563e5c8525b81121bb3706a9a9a3ae102711f3f',
              Gateway: '172.17.0.1',
              IPAddress: '172.17.0.3',
              IPPrefixLen: 16,
              IPv6Gateway: '',
              GlobalIPv6Address: '',
              GlobalIPv6PrefixLen: 0,
              MacAddress: '02:42:ac:11:00:02',
            },
          },
        },
        Mounts: [],
      };
      outputContainerBindPort3 = {
        Id: 'container-id4',
        Names: [`/${RunnerServiceEnum.SOCAT}3`],
        Image: 'image-name:image-tag',
        ImageID: 'sha256:image-id',
        Command: '/bin/sh',
        Created: 1665472068,
        Ports: [],
        Labels: {
          [`${namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${namespace}.publish-port`]: '8082',
        },
        State: 'exited',
        Status: 'Exited',
        HostConfig: {NetworkMode: 'bridge'},
        NetworkSettings: {
          Networks: {
            [networkName]: {
              NetworkID: '7ea29fc1412292a2d7bba362f9253545fecdfa8ce9a6e37dd10ba8bee7129812',
              EndpointID: '2cdc4edb1ded3631c81f57966563e5c8525b81121bb3706a9a9a3ae102711f3f',
              Gateway: '172.17.0.1',
              IPAddress: '172.17.0.4',
              IPPrefixLen: 16,
              IPv6Gateway: '',
              GlobalIPv6Address: '',
              GlobalIPv6PrefixLen: 0,
              MacAddress: '02:42:ac:11:00:02',
            },
          },
        },
        Mounts: [],
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

      const [error] = await repository.create(inputRunnerWithPort);

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

      const [error] = await repository.create(inputRunnerWithPort);

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

      const [error] = await repository.create(inputRunnerWithPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledWith(MystIdentityModel);
      expect(error).toBeInstanceOf(FillDataRepositoryException);
      expect((<FillDataRepositoryException<RunnerLabelNamespace<MystIdentityModel>>>error).fillProperties).toEqual(expect.arrayContaining(['id']));
    });

    it(`Should error create container when get vpn provider model`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([new FillDataRepositoryException<any>([VpnProviderModel.name])]);
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
        };
      });

      const [error] = await repository.create(inputRunnerWithPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(2);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(error).toBeInstanceOf(FillDataRepositoryException);
      expect((<FillDataRepositoryException<RunnerLabelNamespace<any>>>error).fillProperties).toEqual(expect.arrayContaining([VpnProviderModel.name]));
    });

    it(`Should error create container when not filling required field of vpn provider model`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderInvalid]);
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
        };
      });

      const [error] = await repository.create(inputRunnerWithPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(2);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(error).toBeInstanceOf(FillDataRepositoryException);
      expect((<FillDataRepositoryException<RunnerLabelNamespace<VpnProviderModel>>>error).fillProperties).toEqual(expect.arrayContaining(['id']));
    });

    it(`Should error create container when get proxy upstream model`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([new FillDataRepositoryException<any>([ProxyUpstreamModel.name])]);
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
        };
      });

      const [error] = await repository.create(inputRunnerWithPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(error).toBeInstanceOf(FillDataRepositoryException);
      expect((<FillDataRepositoryException<RunnerLabelNamespace<any>>>error).fillProperties).toEqual(expect.arrayContaining([ProxyUpstreamModel.name]));
    });

    it(`Should error create container when not filling required field of proxy upstream model`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyUpstreamInvalid]);
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
        };
      });

      const [error] = await repository.create(inputRunnerWithPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(error).toBeInstanceOf(FillDataRepositoryException);
      expect((<FillDataRepositoryException<RunnerLabelNamespace<ProxyUpstreamModel>>>error).fillProperties).toEqual(expect.arrayContaining(['id']));
    });

    it(`Should error create container when get myst inspect info`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyUpstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      const executeError = new Error('Error in get list of container');
      docker.listContainers.mockRejectedValue(<never>executeError);

      const [error] = await repository.create(inputRunnerWithPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledTimes(1);
      expect(docker.listContainers).toHaveBeenNthCalledWith(1, expect.objectContaining({
        all: false,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
          ],
        }),
      }));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container when no myst container exist`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyUpstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      docker.listContainers.mockResolvedValueOnce(outputEmptyContainerList);

      const [error] = await repository.create(inputRunnerWithPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledTimes(1);
      expect(docker.listContainers).toHaveBeenNthCalledWith(1, expect.objectContaining({
        all: false,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
          ],
        }),
      }));
      expect(error).toBeInstanceOf(NotRunningServiceException);
    });

    it(`Should error create container when get failed containers list has been created before (Create socat with initiated port)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyUpstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
        [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      const executeError = new Error('Error in get list of container');
      docker.listContainers
        .mockResolvedValueOnce(outputExistContainerList)
        .mockRejectedValueOnce(executeError);

      const [error] = await repository.create(inputRunnerWithPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledTimes(2);
      expect(docker.listContainers).toHaveBeenNthCalledWith(1, expect.objectContaining({
        all: false,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
          ],
        }),
      }));
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toHaveLength(0);
      expect(docker.listContainers).toHaveBeenNthCalledWith(2, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          name: [inputRunnerWithPort.name],
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container when get failed container has been created before (Create socat with initiated port)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyUpstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
        [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      docker.listContainers
        .mockResolvedValueOnce(outputExistContainerList)
        .mockResolvedValueOnce([outputCreatedContainer1]);
      const executeError = new Error('Error in get container info');
      docker.getContainer.mockRejectedValueOnce(<never>executeError);

      const [error] = await repository.create(inputRunnerWithPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledTimes(2);
      expect(docker.listContainers).toHaveBeenNthCalledWith(1, expect.objectContaining({
        all: false,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
          ],
        }),
      }));
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toHaveLength(0);
      expect(docker.listContainers).toHaveBeenNthCalledWith(2, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          name: [inputRunnerWithPort.name],
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.getContainer).toHaveBeenCalledTimes(1);
      expect(docker.getContainer).toHaveBeenNthCalledWith(1, outputCreatedContainer1.Id);
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container when get inspect of failed container has been created before (Create socat with initiated port)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyUpstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
        [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      docker.listContainers
        .mockResolvedValueOnce(outputExistContainerList)
        .mockResolvedValueOnce([outputCreatedContainer1]);
      docker.getContainer.mockResolvedValueOnce(<never>outputFailedWithPortUsingContainer);
      const executeError = new Error('Error in get container inspect');
      outputFailedWithPortUsingContainer.inspect.mockRejectedValueOnce(executeError);

      const [error] = await repository.create(inputRunnerWithPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledTimes(2);
      expect(docker.listContainers).toHaveBeenNthCalledWith(1, expect.objectContaining({
        all: false,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
          ],
        }),
      }));
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toHaveLength(0);
      expect(docker.listContainers).toHaveBeenNthCalledWith(2, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          name: [inputRunnerWithPort.name],
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.getContainer).toHaveBeenCalledTimes(1);
      expect(docker.getContainer).toHaveBeenNthCalledWith(1, outputCreatedContainer1.Id);
      expect(outputFailedWithPortUsingContainer.inspect).toHaveBeenCalledTimes(1);
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container when remove failed container has been created before (Create socat with initiated port)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyUpstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
        [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      docker.listContainers
        .mockResolvedValueOnce(outputExistContainerList)
        .mockResolvedValueOnce([outputCreatedContainer1]);
      docker.getContainer.mockResolvedValueOnce(<never>outputFailedWithPortUsingContainer);
      outputFailedWithPortUsingContainer.inspect.mockResolvedValueOnce(outputInspectFailedWithPortUsingContainer);
      const executeError = new Error('Error in remove container');
      outputFailedWithPortUsingContainer.remove.mockRejectedValueOnce(executeError);

      const [error] = await repository.create(inputRunnerWithPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledTimes(2);
      expect(docker.listContainers).toHaveBeenNthCalledWith(1, expect.objectContaining({
        all: false,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
          ],
        }),
      }));
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toHaveLength(0);
      expect(docker.listContainers).toHaveBeenNthCalledWith(2, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          name: [inputRunnerWithPort.name],
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.getContainer).toHaveBeenCalledTimes(1);
      expect(docker.getContainer).toHaveBeenNthCalledWith(1, outputCreatedContainer1.Id);
      expect(outputFailedWithPortUsingContainer.inspect).toHaveBeenCalledTimes(1);
      expect(outputFailedWithPortUsingContainer.remove).toHaveBeenCalledTimes(1);
      expect(outputFailedWithPortUsingContainer.remove).toHaveBeenNthCalledWith(1, {v: true, force: true});
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container when create socat container - first remove failed container (Create socat with initiated port)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyUpstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
        [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      docker.listContainers
        .mockResolvedValueOnce(outputExistContainerList)
        .mockResolvedValueOnce([outputCreatedContainer1]);
      docker.getContainer.mockResolvedValueOnce(<never>outputFailedWithPortUsingContainer);
      outputFailedWithPortUsingContainer.inspect.mockResolvedValueOnce(outputInspectFailedWithPortUsingContainer);
      outputFailedWithPortUsingContainer.remove.mockResolvedValueOnce();
      const executeError = new Error('Error on create container');
      docker.createContainer.mockRejectedValue(executeError);

      const [error] = await repository.create(inputRunnerWithPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledTimes(2);
      expect(docker.listContainers).toHaveBeenNthCalledWith(1, expect.objectContaining({
        all: false,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
          ],
        }),
      }));
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toHaveLength(0);
      expect(docker.listContainers).toHaveBeenNthCalledWith(2, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          name: [inputRunnerWithPort.name],
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.getContainer).toHaveBeenCalledTimes(1);
      expect(docker.getContainer).toHaveBeenNthCalledWith(1, outputCreatedContainer1.Id);
      expect(outputFailedWithPortUsingContainer.inspect).toHaveBeenCalledTimes(1);
      expect(outputFailedWithPortUsingContainer.remove).toHaveBeenCalledTimes(1);
      expect(outputFailedWithPortUsingContainer.remove).toHaveBeenNthCalledWith(1, {v: true, force: true});
      expect(docker.createContainer).toHaveBeenCalledTimes(1);
      expect(docker.createContainer).toHaveBeenNthCalledWith(1, expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.SOCAT,
        Cmd: ['TCP-LISTEN:1234,fork', `TCP:${outputExistContainerList[0].NetworkSettings.Networks[networkName].IPAddress}:${envoyDefaultPort}`],
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.publish-port`]: inputRunnerWithPort.socketPort.toString(),
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
        },
        ExposedPorts: {
          [`1234/tcp`]: {},
        },
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
          ]),
          PortBindings: {
            '1234/tcp': [{HostPort: inputRunnerWithPort.socketPort.toString()}],
          },
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {},
          },
        },
      }));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container when create socat container (Create socat with initiated port)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyUpstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
        [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      docker.listContainers
        .mockResolvedValueOnce(outputExistContainerList)
        .mockResolvedValueOnce([]);
      const executeError = new Error('Error on create container');
      docker.createContainer.mockRejectedValue(executeError);

      const [error] = await repository.create(inputRunnerWithPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledTimes(2);
      expect(docker.listContainers).toHaveBeenNthCalledWith(1, expect.objectContaining({
        all: false,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
          ],
        }),
      }));
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toHaveLength(0);
      expect(docker.listContainers).toHaveBeenNthCalledWith(2, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          name: [inputRunnerWithPort.name],
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.createContainer).toHaveBeenCalledTimes(1);
      expect(docker.createContainer).toHaveBeenNthCalledWith(1, expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.SOCAT,
        Cmd: ['TCP-LISTEN:1234,fork', `TCP:${outputExistContainerList[0].NetworkSettings.Networks[networkName].IPAddress}:${envoyDefaultPort}`],
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.publish-port`]: inputRunnerWithPort.socketPort.toString(),
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
        },
        ExposedPorts: {
          [`1234/tcp`]: {},
        },
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
          ]),
          PortBindings: {
            '1234/tcp': [{HostPort: inputRunnerWithPort.socketPort.toString()}],
          },
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {},
          },
        },
      }));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container when create socat container (Create socat with initiated port)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyUpstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
        [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      docker.listContainers
        .mockResolvedValueOnce(outputExistContainerList)
        .mockResolvedValueOnce([]);
      const executeError = new Error('Error on create container');
      docker.createContainer.mockRejectedValue(executeError);

      const [error] = await repository.create(inputRunnerWithPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledTimes(2);
      expect(docker.listContainers).toHaveBeenNthCalledWith(1, expect.objectContaining({
        all: false,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
          ],
        }),
      }));
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toHaveLength(0);
      expect(docker.listContainers).toHaveBeenNthCalledWith(2, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          name: [inputRunnerWithPort.name],
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.createContainer).toHaveBeenCalledTimes(1);
      expect(docker.createContainer).toHaveBeenNthCalledWith(1, expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.SOCAT,
        Cmd: ['TCP-LISTEN:1234,fork', `TCP:${outputExistContainerList[0].NetworkSettings.Networks[networkName].IPAddress}:${envoyDefaultPort}`],
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.publish-port`]: inputRunnerWithPort.socketPort.toString(),
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
        },
        ExposedPorts: {
          [`1234/tcp`]: {},
        },
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
          ]),
          PortBindings: {
            '1234/tcp': [{HostPort: inputRunnerWithPort.socketPort.toString()}],
          },
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {},
          },
        },
      }));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container with port in use error - remove container after created (Create socat with initiated port)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyUpstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
        [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      docker.listContainers
        .mockResolvedValueOnce(outputExistContainerList)
        .mockResolvedValueOnce([]);
      docker.createContainer.mockResolvedValueOnce(<never>outputCreateContainer);
      const executeError = new Error('Error on create container');
      executeError['statusCode'] = 500;
      executeError['json'] = {message: `driver failed programming external connectivity on endpoint test (container-serial): Bind for 0.0.0.0:${inputRunnerWithPort.socketPort} failed: port is already allocated`};
      outputCreateContainer.start.mockRejectedValue(executeError);
      docker.getContainer.mockResolvedValueOnce(<never>outputFailedWithPortUsingContainer);
      outputFailedWithPortUsingContainer.remove.mockResolvedValueOnce();

      const [error] = await repository.create(inputRunnerWithPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledTimes(2);
      expect(docker.listContainers).toHaveBeenNthCalledWith(1, expect.objectContaining({
        all: false,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
          ],
        }),
      }));
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toHaveLength(0);
      expect(docker.listContainers).toHaveBeenNthCalledWith(2, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          name: [inputRunnerWithPort.name],
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.createContainer).toHaveBeenCalledTimes(1);
      expect(docker.createContainer).toHaveBeenNthCalledWith(1, expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.SOCAT,
        Cmd: ['TCP-LISTEN:1234,fork', `TCP:${outputExistContainerList[0].NetworkSettings.Networks[networkName].IPAddress}:${envoyDefaultPort}`],
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.publish-port`]: inputRunnerWithPort.socketPort.toString(),
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
        },
        ExposedPorts: {
          [`1234/tcp`]: {},
        },
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
          ]),
          PortBindings: {
            '1234/tcp': [{HostPort: inputRunnerWithPort.socketPort.toString()}],
          },
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {},
          },
        },
      }));
      expect(outputCreateContainer.start).toHaveBeenCalled();
      expect(docker.getContainer).toHaveBeenCalledTimes(1);
      expect(docker.getContainer).toHaveBeenNthCalledWith(1, outputCreateContainer.id);
      expect(outputFailedWithPortUsingContainer.inspect).toHaveBeenCalledTimes(0);
      expect(outputFailedWithPortUsingContainer.remove).toHaveBeenCalledTimes(1);
      expect(outputFailedWithPortUsingContainer.remove).toHaveBeenNthCalledWith(1, {v: true, force: true});
      expect(error).toBeInstanceOf(PortInUseException);
    });

    it(`Should error create container when start socat container - remove container after created (Create socat with initiated port)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyUpstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
        [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      docker.listContainers
        .mockResolvedValueOnce(outputExistContainerList)
        .mockResolvedValueOnce([]);
      docker.createContainer.mockResolvedValue(<never>outputCreateContainer);
      const executeError = new Error('Error on start container');
      outputCreateContainer.start.mockRejectedValue(executeError);
      docker.getContainer.mockResolvedValueOnce(<never>outputFailedWithPortUsingContainer);
      outputFailedWithPortUsingContainer.remove.mockResolvedValueOnce();

      const [error] = await repository.create(inputRunnerWithPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledTimes(2);
      expect(docker.listContainers).toHaveBeenNthCalledWith(1, expect.objectContaining({
        all: false,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
          ],
        }),
      }));
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toHaveLength(0);
      expect(docker.listContainers).toHaveBeenNthCalledWith(2, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          name: [inputRunnerWithPort.name],
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.createContainer).toHaveBeenCalledTimes(1);
      expect(docker.createContainer).toHaveBeenNthCalledWith(1, expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.SOCAT,
        Cmd: ['TCP-LISTEN:1234,fork', `TCP:${outputExistContainerList[0].NetworkSettings.Networks[networkName].IPAddress}:${envoyDefaultPort}`],
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.publish-port`]: inputRunnerWithPort.socketPort.toString(),
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
        },
        ExposedPorts: {
          [`1234/tcp`]: {},
        },
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
          ]),
          PortBindings: {
            '1234/tcp': [{HostPort: inputRunnerWithPort.socketPort.toString()}],
          },
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {},
          },
        },
      }));
      expect(outputCreateContainer.start).toHaveBeenCalled();
      expect(docker.getContainer).toHaveBeenCalledTimes(1);
      expect(docker.getContainer).toHaveBeenNthCalledWith(1, outputCreateContainer.id);
      expect(outputFailedWithPortUsingContainer.inspect).toHaveBeenCalledTimes(0);
      expect(outputFailedWithPortUsingContainer.remove).toHaveBeenCalledTimes(1);
      expect(outputFailedWithPortUsingContainer.remove).toHaveBeenNthCalledWith(1, {v: true, force: true});
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully create container (Create socat with initiated port)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyUpstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
        [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      docker.listContainers
        .mockResolvedValueOnce(outputExistContainerList)
        .mockResolvedValueOnce([]);
      docker.createContainer.mockResolvedValue(<never>outputCreateContainer);
      outputCreateContainer.start.mockResolvedValue();

      const [error, result] = await repository.create(inputRunnerWithPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledTimes(2);
      expect(docker.listContainers).toHaveBeenNthCalledWith(1, expect.objectContaining({
        all: false,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
          ],
        }),
      }));
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toHaveLength(0);
      expect(docker.listContainers).toHaveBeenNthCalledWith(2, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          name: [inputRunnerWithPort.name],
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.createContainer).toHaveBeenCalledTimes(1);
      expect(docker.createContainer).toHaveBeenNthCalledWith(1, expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.SOCAT,
        Cmd: ['TCP-LISTEN:1234,fork', `TCP:${outputExistContainerList[0].NetworkSettings.Networks[networkName].IPAddress}:${envoyDefaultPort}`],
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.publish-port`]: inputRunnerWithPort.socketPort.toString(),
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
        },
        ExposedPorts: {
          [`1234/tcp`]: {},
        },
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
          ]),
          PortBindings: {
            '1234/tcp': [{HostPort: inputRunnerWithPort.socketPort.toString()}],
          },
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {},
          },
        },
      }));
      expect(outputCreateContainer.start).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toMatchObject<RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>>({
        id: identifierMock.generateId(),
        serial: outputCreateContainer.id,
        name: RunnerServiceEnum.SOCAT,
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketPort: inputRunnerWithPort.socketPort,
        label: [
          {
            $namespace: MystIdentityModel.name,
            id: outputMystIdentityValid.id,
          },
          {
            $namespace: VpnProviderModel.name,
            id: outputVpnProviderValid.id,
          },
          {
            $namespace: ProxyUpstreamModel.name,
            id: outputProxyUpstreamValid.id,
          },
        ],
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
    });

    it(`Should error create container when select last bind port and increase port (Create socat without port)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyUpstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
        [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      const executeError = new Error('Error in get list of container');
      docker.listContainers
        .mockResolvedValueOnce(outputExistContainerList)
        .mockRejectedValueOnce(executeError);

      const [error] = await repository.create(inputRunnerWithoutPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledTimes(2);
      expect(docker.listContainers).toHaveBeenNthCalledWith(1, expect.objectContaining({
        all: false,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
          ],
        }),
      }));
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toHaveLength(0);
      expect(docker.listContainers).toHaveBeenNthCalledWith(2, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully create container and select default start port if not found any bind port (Create socat without port)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyUpstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
        [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      docker.listContainers
        .mockResolvedValueOnce(outputExistContainerList)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      docker.createContainer.mockResolvedValue(<never>outputCreateContainer);
      outputCreateContainer.start.mockResolvedValue();

      const [error, result] = await repository.create(inputRunnerWithoutPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledTimes(3);
      expect(docker.listContainers).toHaveBeenNthCalledWith(1, expect.objectContaining({
        all: false,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
          ],
        }),
      }));
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toHaveLength(0);
      expect(docker.listContainers).toHaveBeenNthCalledWith(2, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.listContainers).toHaveBeenNthCalledWith(3, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          name: [inputRunnerWithPort.name],
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.createContainer).toHaveBeenCalledTimes(1);
      expect(docker.createContainer).toHaveBeenNthCalledWith(1, expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.SOCAT,
        Cmd: ['TCP-LISTEN:1234,fork', `TCP:${outputExistContainerList[0].NetworkSettings.Networks[networkName].IPAddress}:${envoyDefaultPort}`],
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.publish-port`]: startPortBinding.toString(),
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
        },
        ExposedPorts: {
          [`1234/tcp`]: {},
        },
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
          ]),
          PortBindings: {
            '1234/tcp': [{HostPort: startPortBinding.toString()}],
          },
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {},
          },
        },
      }));
      expect(error).toBeNull();
      expect(result).toMatchObject<RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>>({
        id: identifierMock.generateId(),
        serial: outputCreateContainer.id,
        name: RunnerServiceEnum.SOCAT,
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketPort: startPortBinding,
        label: [
          {
            $namespace: MystIdentityModel.name,
            id: outputMystIdentityValid.id,
          },
          {
            $namespace: VpnProviderModel.name,
            id: outputVpnProviderValid.id,
          },
          {
            $namespace: ProxyUpstreamModel.name,
            id: outputProxyUpstreamValid.id,
          },
        ],
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
    });

    it(`Should successfully create container and select next port (Create socat without port)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyUpstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
        [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      docker.listContainers
        .mockResolvedValueOnce(outputExistContainerList)
        .mockResolvedValueOnce([outputContainerBindPort1, outputContainerBindPort2])
        .mockResolvedValueOnce([]);
      docker.createContainer.mockResolvedValue(<never>outputCreateContainer);
      outputCreateContainer.start.mockResolvedValue();

      const [error, result] = await repository.create(inputRunnerWithoutPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledTimes(3);
      expect(docker.listContainers).toHaveBeenNthCalledWith(1, expect.objectContaining({
        all: false,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
          ],
        }),
      }));
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toHaveLength(0);
      expect(docker.listContainers).toHaveBeenNthCalledWith(2, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.listContainers).toHaveBeenNthCalledWith(3, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          name: [inputRunnerWithPort.name],
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.createContainer).toHaveBeenCalledTimes(1);
      expect(docker.createContainer).toHaveBeenNthCalledWith(1, expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.SOCAT,
        Cmd: ['TCP-LISTEN:1234,fork', `TCP:${outputExistContainerList[0].NetworkSettings.Networks[networkName].IPAddress}:${envoyDefaultPort}`],
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.publish-port`]: outputContainerBindPort3.Labels[`${namespace}.publish-port`],
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
        },
        ExposedPorts: {
          [`1234/tcp`]: {},
        },
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
          ]),
          PortBindings: {
            '1234/tcp': [{HostPort: outputContainerBindPort3.Labels[`${namespace}.publish-port`]}],
          },
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {},
          },
        },
      }));
      expect(error).toBeNull();
      expect(result).toMatchObject<RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>>({
        id: identifierMock.generateId(),
        serial: outputCreateContainer.id,
        name: RunnerServiceEnum.SOCAT,
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketPort: Number(outputContainerBindPort3.Labels[`${namespace}.publish-port`]),
        label: [
          {
            $namespace: MystIdentityModel.name,
            id: outputMystIdentityValid.id,
          },
          {
            $namespace: VpnProviderModel.name,
            id: outputVpnProviderValid.id,
          },
          {
            $namespace: ProxyUpstreamModel.name,
            id: outputProxyUpstreamValid.id,
          },
        ],
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
    });

    it(`Should error create container when trying to select next port but failed to bind (Create socat without port)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyUpstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
        [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      docker.listContainers
        .mockResolvedValueOnce(outputExistContainerList)
        .mockResolvedValueOnce([outputContainerBindPort1])
        .mockResolvedValueOnce([outputCreatedContainer1])
        .mockResolvedValueOnce([outputContainerBindPort1])
        .mockResolvedValueOnce([outputCreatedContainer1])
        .mockResolvedValueOnce([outputContainerBindPort1])
        .mockResolvedValueOnce([outputCreatedContainer1]);
      docker.createContainer.mockResolvedValue(<never>outputCreateContainer);
      const executeError = new Error('Error on create container');
      executeError['statusCode'] = 500;
      executeError['json'] = {message: `driver failed programming external connectivity on endpoint test (container-serial): Bind for 0.0.0.0:${inputRunnerWithPort.socketPort} failed: port is already allocated`};
      outputCreateContainer.start.mockRejectedValue(executeError);
      (<jest.Mock>setTimeout).mockResolvedValue(null);
      docker.getContainer.mockResolvedValue(<never>outputFailedWithPortUsingContainer);
      outputFailedWithPortUsingContainer.inspect.mockResolvedValue(outputInspectFailedWithPortUsingContainer);
      outputFailedWithPortUsingContainer.remove.mockResolvedValue();

      const [error] = await repository.create(inputRunnerWithoutPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledTimes(7);
      expect(docker.listContainers).toHaveBeenNthCalledWith(1, expect.objectContaining({
        all: false,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
          ],
        }),
      }));
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toHaveLength(0);
      expect(docker.createContainer).toHaveBeenCalledTimes(3);
      expect(outputCreateContainer.start).toHaveBeenCalledTimes(3);
      expect(setTimeout).toHaveBeenCalledTimes(3);
      expect(docker.getContainer).toHaveBeenCalledTimes(4);
      expect(outputFailedWithPortUsingContainer.inspect).toHaveBeenCalledTimes(3);
      expect(outputFailedWithPortUsingContainer.remove).toHaveBeenCalledTimes(4);
      expect(docker.listContainers).toHaveBeenNthCalledWith(2, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.listContainers).toHaveBeenNthCalledWith(3, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          name: [inputRunnerWithPort.name],
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.createContainer).toHaveBeenNthCalledWith(1, expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.SOCAT,
        Cmd: ['TCP-LISTEN:1234,fork', `TCP:${outputExistContainerList[0].NetworkSettings.Networks[networkName].IPAddress}:${envoyDefaultPort}`],
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.publish-port`]: outputContainerBindPort2.Labels[`${namespace}.publish-port`],
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
        },
        ExposedPorts: {
          [`1234/tcp`]: {},
        },
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
          ]),
          PortBindings: {
            '1234/tcp': [{HostPort: outputContainerBindPort2.Labels[`${namespace}.publish-port`]}],
          },
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {},
          },
        },
      }));
      expect((<jest.Mock>setTimeout).mock.calls[0][0]).toEqual(expect.any(Number));
      expect(docker.listContainers).toHaveBeenNthCalledWith(4, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.listContainers).toHaveBeenNthCalledWith(5, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          name: [inputRunnerWithPort.name],
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.createContainer).toHaveBeenNthCalledWith(2, expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.SOCAT,
        Cmd: ['TCP-LISTEN:1234,fork', `TCP:${outputExistContainerList[0].NetworkSettings.Networks[networkName].IPAddress}:${envoyDefaultPort}`],
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.publish-port`]: outputContainerBindPort2.Labels[`${namespace}.publish-port`],
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
        },
        ExposedPorts: {
          [`1234/tcp`]: {},
        },
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
          ]),
          PortBindings: {
            '1234/tcp': [{HostPort: outputContainerBindPort2.Labels[`${namespace}.publish-port`]}],
          },
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {},
          },
        },
      }));
      expect((<jest.Mock>setTimeout).mock.calls[1][0]).toEqual(expect.any(Number));
      expect(docker.listContainers).toHaveBeenNthCalledWith(6, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.listContainers).toHaveBeenNthCalledWith(7, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          name: [inputRunnerWithPort.name],
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.createContainer).toHaveBeenNthCalledWith(3, expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.SOCAT,
        Cmd: ['TCP-LISTEN:1234,fork', `TCP:${outputExistContainerList[0].NetworkSettings.Networks[networkName].IPAddress}:${envoyDefaultPort}`],
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.publish-port`]: outputContainerBindPort2.Labels[`${namespace}.publish-port`],
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
        },
        ExposedPorts: {
          [`1234/tcp`]: {},
        },
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
          ]),
          PortBindings: {
            '1234/tcp': [{HostPort: outputContainerBindPort2.Labels[`${namespace}.publish-port`]}],
          },
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {},
          },
        },
      }));
      expect((<jest.Mock>setTimeout).mock.calls[2][0]).toEqual(expect.any(Number));
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create container when trying to select next port but failed to create (Create socat without port)`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyUpstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      const convertLabelToObjectMock = jest.fn().mockReturnValue({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
        [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      docker.listContainers
        .mockResolvedValueOnce(outputExistContainerList)
        .mockResolvedValueOnce([outputContainerBindPort1])
        .mockResolvedValueOnce([outputCreatedContainer1])
        .mockResolvedValueOnce([outputContainerBindPort1])
        .mockResolvedValueOnce([outputCreatedContainer1])
        .mockResolvedValueOnce([outputContainerBindPort1])
        .mockResolvedValueOnce([outputCreatedContainer1]);
      const executeBindError = new Error('Error on create container');
      executeBindError['statusCode'] = 500;
      executeBindError['json'] = {message: `driver failed programming external connectivity on endpoint test (container-serial): Bind for 0.0.0.0:${inputRunnerWithPort.socketPort} failed: port is already allocated`};
      docker.createContainer.mockResolvedValueOnce(<never>outputCreateContainer);
      outputCreateContainer.start.mockRejectedValueOnce(executeBindError);
      docker.createContainer.mockResolvedValueOnce(<never>outputCreateContainer);
      outputCreateContainer.start.mockRejectedValueOnce(executeBindError);
      const executeError = new Error('Error on create container');
      docker.createContainer.mockRejectedValueOnce(executeError);
      (<jest.Mock>setTimeout).mockResolvedValue(null);
      docker.getContainer.mockResolvedValue(<never>outputFailedWithPortUsingContainer);
      outputFailedWithPortUsingContainer.inspect.mockResolvedValue(outputInspectFailedWithPortUsingContainer);
      outputFailedWithPortUsingContainer.remove.mockResolvedValue();

      const [error] = await repository.create(inputRunnerWithoutPort);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyUpstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalledTimes(7);
      expect(docker.listContainers).toHaveBeenNthCalledWith(1, expect.objectContaining({
        all: false,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.MYST}`,
            `${namespace}.myst-identity-model.id=${outputMystIdentityValid.id}`,
          ],
        }),
      }));
      expect(convertLabelToObjectMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectMock.mock.calls[0][1]).toHaveLength(0);
      expect(docker.createContainer).toHaveBeenCalledTimes(3);
      expect(outputCreateContainer.start).toHaveBeenCalledTimes(2);
      expect(setTimeout).toHaveBeenCalledTimes(2);
      expect(docker.getContainer).toHaveBeenCalledTimes(4);
      expect(outputFailedWithPortUsingContainer.inspect).toHaveBeenCalledTimes(3);
      expect(outputFailedWithPortUsingContainer.remove).toHaveBeenCalledTimes(4);
      expect(docker.listContainers).toHaveBeenNthCalledWith(2, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.listContainers).toHaveBeenNthCalledWith(3, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          name: [inputRunnerWithPort.name],
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.createContainer).toHaveBeenNthCalledWith(1, expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.SOCAT,
        Cmd: ['TCP-LISTEN:1234,fork', `TCP:${outputExistContainerList[0].NetworkSettings.Networks[networkName].IPAddress}:${envoyDefaultPort}`],
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.publish-port`]: outputContainerBindPort2.Labels[`${namespace}.publish-port`],
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
        },
        ExposedPorts: {
          [`1234/tcp`]: {},
        },
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
          ]),
          PortBindings: {
            '1234/tcp': [{HostPort: outputContainerBindPort2.Labels[`${namespace}.publish-port`]}],
          },
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {},
          },
        },
      }));
      expect((<jest.Mock>setTimeout).mock.calls[0][0]).toEqual(expect.any(Number));
      expect(docker.listContainers).toHaveBeenNthCalledWith(4, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.listContainers).toHaveBeenNthCalledWith(5, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          name: [inputRunnerWithPort.name],
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.createContainer).toHaveBeenNthCalledWith(2, expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.SOCAT,
        Cmd: ['TCP-LISTEN:1234,fork', `TCP:${outputExistContainerList[0].NetworkSettings.Networks[networkName].IPAddress}:${envoyDefaultPort}`],
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.publish-port`]: outputContainerBindPort2.Labels[`${namespace}.publish-port`],
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
        },
        ExposedPorts: {
          [`1234/tcp`]: {},
        },
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
          ]),
          PortBindings: {
            '1234/tcp': [{HostPort: outputContainerBindPort2.Labels[`${namespace}.publish-port`]}],
          },
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {},
          },
        },
      }));
      expect((<jest.Mock>setTimeout).mock.calls[1][0]).toEqual(expect.any(Number));
      expect(docker.listContainers).toHaveBeenNthCalledWith(6, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.listContainers).toHaveBeenNthCalledWith(7, expect.objectContaining({
        all: true,
        filters: JSON.stringify({
          name: [inputRunnerWithPort.name],
          status: ['created'],
          label: [
            `${namespace}.project=${RunnerServiceEnum.SOCAT}`,
            `${namespace}.publish-port`,
          ],
        }),
      }));
      expect(docker.createContainer).toHaveBeenNthCalledWith(3, expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.SOCAT,
        Cmd: ['TCP-LISTEN:1234,fork', `TCP:${outputExistContainerList[0].NetworkSettings.Networks[networkName].IPAddress}:${envoyDefaultPort}`],
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.SOCAT,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.publish-port`]: outputContainerBindPort2.Labels[`${namespace}.publish-port`],
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.proxy-upstream-model.id`]: outputProxyUpstreamValid.id,
        },
        ExposedPorts: {
          [`1234/tcp`]: {},
        },
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
          ]),
          PortBindings: {
            '1234/tcp': [{HostPort: outputContainerBindPort2.Labels[`${namespace}.publish-port`]}],
          },
          NetworkMode: 'bridge',
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [networkName]: {},
          },
        },
      }));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });
  });
});
