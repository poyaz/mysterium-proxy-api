import {DockerRunnerCreateEnvoyRepository} from './docker-runner-create-envoy.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {Test, TestingModule} from '@nestjs/testing';
import {
  RunnerExecEnum,
  RunnerLabelNamespace,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyTypeEnum} from '@src-core/model/proxy.model';
import {defaultModelFactory, defaultModelType} from '@src-core/model/defaultModel';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import {DockerLabelParser} from '@src-infrastructure/utility/docker-label-parser';
import Docker = require('dockerode');
import {RepositoryException} from '@src-core/exception/repository.exception';
import {NotRunningServiceException} from '@src-core/exception/not-running-service.exception';
import Dockerode from 'dockerode';

jest.mock('@src-infrastructure/utility/docker-label-parser');

describe('DockerRunnerCreateEnvoyRepository', () => {
  let repository: DockerRunnerCreateEnvoyRepository;
  let docker: MockProxy<Docker>;
  let identifierMock: MockProxy<IIdentifier>;
  let imageName: string;
  let hostVolumeConfigName: string;
  let defaultPort: number;
  let networkName: string;
  let namespace: string;

  beforeEach(async () => {
    docker = mock<Docker>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    imageName = 'mysterium-proxy-api-envoy';
    hostVolumeConfigName = 'host-envoy-config-volume-name';
    defaultPort = 10001;
    networkName = 'mysterium-proxy-api_main';
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
          provide: DockerRunnerCreateEnvoyRepository,
          inject: [dockerProvider, identifierMockProvider],
          useFactory: (docker: Docker, identifierMock: IIdentifier) =>
            new DockerRunnerCreateEnvoyRepository(
              docker,
              identifierMock,
              {imageName, hostVolumeConfigName: hostVolumeConfigName, defaultPort, networkName},
              namespace,
            ),
        },
      ],
    }).compile();

    repository = module.get<DockerRunnerCreateEnvoyRepository>(DockerRunnerCreateEnvoyRepository);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it(`should be defined`, () => {
    expect(repository).toBeDefined();
  });

  it(`should be envoy service type`, () => {
    expect(repository.serviceType).toEqual(RunnerServiceEnum.ENVOY);
  });

  describe(`Create envoy container`, () => {
    let inputRunner: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>;
    let outputMystIdentityInvalid: defaultModelType<MystIdentityModel>;
    let outputMystIdentityValid: defaultModelType<MystIdentityModel>;
    let outputVpnProviderInvalid: defaultModelType<VpnProviderModel>;
    let outputVpnProviderValid: defaultModelType<VpnProviderModel>;
    let outputProxyDownstreamInvalid: defaultModelType<ProxyDownstreamModel>;
    let outputProxyDownstreamValid: defaultModelType<ProxyDownstreamModel>;
    let outputEmptyContainerList: Array<Dockerode.ContainerInfo>;
    let outputExistContainerList: Array<Dockerode.ContainerInfo>;
    let outputCreateContainer: { id: string, start: any };

    beforeEach(() => {
      inputRunner = defaultModelFactory<RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>>(
        RunnerModel,
        {
          id: 'default-id',
          serial: 'default-serial',
          name: 'envoy',
          service: RunnerServiceEnum.ENVOY,
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
              $namespace: ProxyDownstreamModel.name,
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
          id: inputRunner.label.find((v) => v.$namespace === MystIdentityModel.name).id,
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
          insertDate: new Date(),
        },
        ['id', 'userIdentity', 'providerIdentity', 'serviceType', 'providerName', 'providerIpType', 'country', 'isRegister', 'insertDate'],
      );
      outputVpnProviderValid = defaultModelFactory<VpnProviderModel>(
        VpnProviderModel,
        {
          id: inputRunner.label.find((v) => v.$namespace === VpnProviderModel.name).id,
          userIdentity: 'default-user-identity',
          serviceType: VpnServiceTypeEnum.WIREGUARD,
          providerName: VpnProviderName.MYSTERIUM,
          providerIdentity: 'default-provider-identity',
          providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
          country: 'default-country',
          isRegister: false,
          insertDate: new Date(),
        },
        ['userIdentity', 'providerIdentity', 'serviceType', 'providerName', 'providerIpType', 'country', 'isRegister', 'insertDate'],
      );

      outputProxyDownstreamInvalid = defaultModelFactory<ProxyDownstreamModel>(
        ProxyDownstreamModel,
        {
          id: 'default-id',
          refId: 'default-ref-id',
          ip: 'default-ip',
          mask: 32,
          type: ProxyTypeEnum.MYST,
          status: ProxyStatusEnum.DISABLE,
        },
        ['id', 'refId', 'ip', 'mask', 'type', 'status'],
      );
      outputProxyDownstreamValid = defaultModelFactory<ProxyDownstreamModel>(
        ProxyDownstreamModel,
        {
          id: inputRunner.label.find((v) => v.$namespace === ProxyDownstreamModel.name).id,
          refId: 'default-ref-id',
          ip: 'default-ip',
          mask: 32,
          type: ProxyTypeEnum.MYST,
          status: ProxyStatusEnum.DISABLE,
        },
        ['refId', 'ip', 'mask', 'type', 'status'],
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

      const [error] = await repository.create(inputRunner);

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

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(2);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(error).toBeInstanceOf(FillDataRepositoryException);
      expect((<FillDataRepositoryException<RunnerLabelNamespace<VpnProviderModel>>>error).fillProperties).toEqual(expect.arrayContaining(['id']));
    });

    it(`Should error create container when get proxy downstream model`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([new FillDataRepositoryException<any>([ProxyDownstreamModel.name])]);
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
        };
      });

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyDownstreamModel);
      expect(error).toBeInstanceOf(FillDataRepositoryException);
      expect((<FillDataRepositoryException<RunnerLabelNamespace<any>>>error).fillProperties).toEqual(expect.arrayContaining([ProxyDownstreamModel.name]));
    });

    it(`Should error create container when not filling required field of proxy downstream model`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyDownstreamInvalid]);
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
        };
      });

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyDownstreamModel);
      expect(error).toBeInstanceOf(FillDataRepositoryException);
      expect((<FillDataRepositoryException<RunnerLabelNamespace<ProxyDownstreamModel>>>error).fillProperties).toEqual(expect.arrayContaining(['id']));
    });

    it(`Should error create container when get myst inspect info`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyDownstreamValid]);
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

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyDownstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalledWith(expect.objectContaining({
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
        .mockReturnValueOnce([null, outputProxyDownstreamValid]);
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
      docker.listContainers.mockResolvedValue(outputEmptyContainerList);

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyDownstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalledWith(expect.objectContaining({
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

    it(`Should error create container when create envoy container`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyDownstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      const convertLabelToObjectMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
        [`${namespace}.proxy-downstream-model.id`]: outputProxyDownstreamValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      docker.listContainers.mockResolvedValue(outputExistContainerList);
      const executeError = new Error('Error on create container');
      docker.createContainer.mockRejectedValue(executeError);

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyDownstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalledWith(expect.objectContaining({
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
      expect(docker.createContainer).toHaveBeenCalled();
      expect(docker.createContainer).toHaveBeenCalledWith(expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.ENVOY,
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.ENVOY,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.proxy-downstream-model.id`]: outputProxyDownstreamValid.id,
        },
        Env: expect.arrayContaining([
          `NODE_PROXY_PORT=${inputRunner.socketUri}`,
        ]),
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
            `${hostVolumeConfigName}:/etc/envoy/`,
          ]),
          NetworkMode: `container:${outputExistContainerList[0].Id}`,
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {},
      }));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error create container when start envoy container`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyDownstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      const convertLabelToObjectMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
        [`${namespace}.proxy-downstream-model.id`]: outputProxyDownstreamValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      docker.listContainers.mockResolvedValue(outputExistContainerList);
      docker.createContainer.mockResolvedValue(<never>outputCreateContainer);
      const executeError = new Error('Error on start container');
      outputCreateContainer.start.mockRejectedValue(executeError);

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyDownstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalledWith(expect.objectContaining({
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
      expect(docker.createContainer).toHaveBeenCalled();
      expect(docker.createContainer).toHaveBeenCalledWith(expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.ENVOY,
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.ENVOY,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.proxy-downstream-model.id`]: outputProxyDownstreamValid.id,
        },
        Env: expect.arrayContaining([
          `NODE_PROXY_PORT=${inputRunner.socketUri}`,
        ]),
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
            `${hostVolumeConfigName}:/etc/envoy/`,
          ]),
          NetworkMode: `container:${outputExistContainerList[0].Id}`,
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {},
      }));
      expect(outputCreateContainer.start).toHaveBeenCalled();
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully create container`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid])
        .mockReturnValueOnce([null, outputProxyDownstreamValid]);
      const convertLabelToObjectAndPickMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
      });
      const convertLabelToObjectMock = jest.fn().mockReturnValueOnce({
        [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
        [`${namespace}.proxy-downstream-model.id`]: outputProxyDownstreamValid.id,
      });
      (<jest.Mock><unknown>DockerLabelParser).mockImplementation(() => {
        return {
          parseLabel: parseLabelMock,
          getClassInstance: getClassInstanceMock,
          convertLabelToObject: convertLabelToObjectMock,
          convertLabelToObjectAndPick: convertLabelToObjectAndPickMock,
        };
      });
      docker.listContainers.mockResolvedValue(outputExistContainerList);
      docker.createContainer.mockResolvedValue(<never>outputCreateContainer);
      outputCreateContainer.start.mockResolvedValue();

      const [error, result] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(3);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(3, ProxyDownstreamModel);
      expect(convertLabelToObjectAndPickMock).toHaveBeenCalledTimes(1);
      expect(convertLabelToObjectAndPickMock.mock.calls[0][2]).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase']));
      expect(docker.listContainers).toHaveBeenCalled();
      expect(docker.listContainers).toHaveBeenCalledWith(expect.objectContaining({
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
      expect(docker.createContainer).toHaveBeenCalled();
      expect(docker.createContainer).toHaveBeenCalledWith(expect.objectContaining({
        Image: imageName,
        name: RunnerServiceEnum.ENVOY,
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.ENVOY,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.proxy-downstream-model.id`]: outputProxyDownstreamValid.id,
        },
        Env: expect.arrayContaining([
          `NODE_PROXY_PORT=${inputRunner.socketUri}`,
        ]),
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
            `${hostVolumeConfigName}:/etc/envoy/`,
          ]),
          NetworkMode: `container:${outputExistContainerList[0].Id}`,
          RestartPolicy: {
            Name: 'always',
          },
        },
        NetworkingConfig: {},
      }));
      expect(outputCreateContainer.start).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toMatchObject<RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>>({
        id: identifierMock.generateId(),
        serial: outputCreateContainer.id,
        name: RunnerServiceEnum.ENVOY,
        service: RunnerServiceEnum.ENVOY,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: outputExistContainerList[0].NetworkSettings.Networks[networkName].IPAddress,
        socketPort: defaultPort,
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
            $namespace: ProxyDownstreamModel.name,
            id: outputProxyDownstreamValid.id,
          },
        ],
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
    });
  });
});
