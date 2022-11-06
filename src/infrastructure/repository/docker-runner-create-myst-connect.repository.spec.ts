import {DockerRunnerCreateMystConnectRepository} from './docker-runner-create-myst-connect.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {Test, TestingModule} from '@nestjs/testing';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {DockerLabelParser} from '@src-infrastructure/utility/docker-label-parser';
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
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import {defaultModelFactory, defaultModelType} from '@src-core/model/defaultModel';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import Docker = require('dockerode');
import {RepositoryException} from '@src-core/exception/repository.exception';
import Dockerode from 'dockerode';
import {NotRunningServiceException} from '@src-core/exception/not-running-service.exception';

jest.mock('@src-infrastructure/utility/docker-label-parser');

describe('DockerRunnerCreateMystConnectRepository', () => {
  let repository: DockerRunnerCreateMystConnectRepository;
  let docker: MockProxy<Docker>;
  let identifierMock: MockProxy<IIdentifier>;
  let networkName: string;
  let imageName: string;
  let redisHost: string;
  let redisPort: number;
  let redisDb: number;
  let namespace: string;

  beforeEach(async () => {
    docker = mock<Docker>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    networkName = 'mysterium-proxy-api_main';
    imageName = 'mysterium-proxy-api-myst-connect';
    redisHost = '127.0.0.1';
    redisPort = 6379;
    redisDb = 1;
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
          provide: DockerRunnerCreateMystConnectRepository,
          inject: [ProviderTokenEnum.DOCKER_DYNAMIC_MODULE, ProviderTokenEnum.IDENTIFIER_UUID],
          useFactory: (docker: Docker, identity: IIdentifier) =>
            new DockerRunnerCreateMystConnectRepository(
              docker,
              identity,
              {imageName, networkName},
              {host: redisHost, port: redisPort, db: redisDb},
              namespace,
            ),
        },
      ],
    }).compile();

    repository = module.get<DockerRunnerCreateMystConnectRepository>(DockerRunnerCreateMystConnectRepository);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe(`Create myst-connect container`, () => {
    let inputRunner: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputMystIdentityInvalid: defaultModelType<MystIdentityModel>;
    let outputMystIdentityValid: defaultModelType<MystIdentityModel>;
    let outputVpnProviderInvalid: defaultModelType<VpnProviderModel>;
    let outputVpnProviderValid: defaultModelType<VpnProviderModel>;
    let outputEmptyContainerList: Array<Dockerode.ContainerInfo>;
    let outputExistContainerList: Array<Dockerode.ContainerInfo>;
    let outputCreateContainer: { id: string, start: any };

    beforeEach(() => {
      inputRunner = defaultModelFactory<RunnerModel<[MystIdentityModel, VpnProviderModel]>>(
        RunnerModel,
        {
          id: 'default-id',
          serial: 'default-serial',
          name: 'myst-connect',
          service: RunnerServiceEnum.MYST_CONNECT,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.NONE,
          label: [
            {
              $namespace: MystIdentityModel.name,
              id: identifierMock.generateId(),
              identity: 'identity-1',
            },
            {
              $namespace: VpnProviderModel.name,
              id: identifierMock.generateId(),
              userIdentity: 'identity-1',
              providerIdentity: 'providerIdentity1',
            },
          ],
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
          identity: inputRunner.label[0].passphrase,
          passphrase: 'default-passphrase',
          path: 'default-path',
          filename: 'default-filename',
          isUse: false,
          insertDate: new Date(),
        },
        ['id', 'passphrase', 'path', 'filename', 'isUse', 'insertDate'],
      );

      outputMystIdentityValid = defaultModelFactory<MystIdentityModel>(
        MystIdentityModel,
        {
          id: inputRunner.label[0].id,
          identity: inputRunner.label[0].identity,
          passphrase: 'default-passphrase',
          path: 'default-path',
          filename: 'default-filename',
          isUse: false,
          insertDate: new Date(),
        },
        ['passphrase', 'path', 'filename', 'isUse', 'insertDate'],
      );

      outputVpnProviderInvalid = defaultModelFactory<VpnProviderModel>(
        VpnProviderModel,
        {
          id: 'default-id',
          userIdentity: inputRunner.label[1].userIdentity,
          serviceType: VpnServiceTypeEnum.WIREGUARD,
          providerName: VpnProviderName.MYSTERIUM,
          providerIdentity: inputRunner.label[1].providerIdentity,
          providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
          country: 'default-country',
          isRegister: false,
          insertDate: new Date(),
        },
        ['id', 'serviceType', 'providerName', 'providerIpType', 'country', 'isRegister', 'insertDate'],
      );

      outputVpnProviderValid = defaultModelFactory<VpnProviderModel>(
        VpnProviderModel,
        {
          id: inputRunner.label[1].id,
          userIdentity: inputRunner.label[1].userIdentity,
          serviceType: VpnServiceTypeEnum.WIREGUARD,
          providerName: VpnProviderName.MYSTERIUM,
          providerIdentity: inputRunner.label[1].providerIdentity,
          providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
          country: 'default-country',
          isRegister: false,
          insertDate: new Date(),
        },
        ['serviceType', 'providerName', 'providerIpType', 'country', 'isRegister', 'insertDate'],
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
          NetworkSettings: {Networks: {}},
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

    it(`Should error create container when get myst inspect info`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid]);
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
      expect(getClassInstanceMock).toHaveBeenCalledTimes(2);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
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
        .mockReturnValueOnce([null, outputVpnProviderValid]);
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
      docker.listContainers.mockResolvedValue(outputEmptyContainerList);

      const [error] = await repository.create(inputRunner);

      expect(DockerLabelParser).toHaveBeenCalled();
      expect(parseLabelMock).toHaveBeenCalled();
      expect(getClassInstanceMock).toHaveBeenCalledTimes(2);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
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

    it(`Should error create container when create myst-connect container`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid]);
      const convertLabelToObjectAndPickMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        });
      const convertLabelToObjectMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.vpn-provider-model.user-identity`]: outputVpnProviderValid.userIdentity,
          [`${namespace}.vpn-provider-model.provider-identity`]: outputVpnProviderValid.providerIdentity,
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
      expect(getClassInstanceMock).toHaveBeenCalledTimes(2);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
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
        name: RunnerServiceEnum.MYST_CONNECT,
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.MYST_CONNECT,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.vpn-provider-model.user-identity`]: outputVpnProviderValid.userIdentity,
          [`${namespace}.vpn-provider-model.provider-identity`]: outputVpnProviderValid.providerIdentity,
        },
        Env: expect.arrayContaining([
          `MYST_API_BASE_ADDRESS=https://127.0.0.1:4050`,
          `MYST_IDENTITY=${outputMystIdentityValid.identity}`,
          `PROVIDER_IDENTITY=${outputVpnProviderValid.providerIdentity}`,
          `REDIS_HOST=${redisHost}`,
          `REDIS_PORT=${redisPort}`,
          `REDIS_DB=${redisDb}`,
          `REDIS_PROVIDER_INFO_KEY=myst_provider:info:all`,
        ]),
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
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

    it(`Should error create container when start myst-connect container`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid]);
      const convertLabelToObjectAndPickMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        });
      const convertLabelToObjectMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.vpn-provider-model.user-identity`]: outputVpnProviderValid.userIdentity,
          [`${namespace}.vpn-provider-model.provider-identity`]: outputVpnProviderValid.providerIdentity,
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
      expect(getClassInstanceMock).toHaveBeenCalledTimes(2);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
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
        name: RunnerServiceEnum.MYST_CONNECT,
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.MYST_CONNECT,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.vpn-provider-model.user-identity`]: outputVpnProviderValid.userIdentity,
          [`${namespace}.vpn-provider-model.provider-identity`]: outputVpnProviderValid.providerIdentity,
        },
        Env: expect.arrayContaining([
          `MYST_API_BASE_ADDRESS=https://127.0.0.1:4050`,
          `MYST_IDENTITY=${outputMystIdentityValid.identity}`,
          `PROVIDER_IDENTITY=${outputVpnProviderValid.providerIdentity}`,
          `REDIS_HOST=${redisHost}`,
          `REDIS_PORT=${redisPort}`,
          `REDIS_DB=${redisDb}`,
          `REDIS_PROVIDER_INFO_KEY=myst_provider:info:all`,
        ]),
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
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

    it(`Should error create container when start myst-connect container`, async () => {
      const parseLabelMock = jest.fn().mockReturnValue([null]);
      const getClassInstanceMock = jest.fn()
        .mockReturnValueOnce([null, outputMystIdentityValid])
        .mockReturnValueOnce([null, outputVpnProviderValid]);
      const convertLabelToObjectAndPickMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
        });
      const convertLabelToObjectMock = jest.fn()
        .mockReturnValueOnce({
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.vpn-provider-model.user-identity`]: outputVpnProviderValid.userIdentity,
          [`${namespace}.vpn-provider-model.provider-identity`]: outputVpnProviderValid.providerIdentity,
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
      expect(getClassInstanceMock).toHaveBeenCalledTimes(2);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(1, MystIdentityModel);
      expect(getClassInstanceMock).toHaveBeenNthCalledWith(2, VpnProviderModel);
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
        name: RunnerServiceEnum.MYST_CONNECT,
        Labels: {
          autoheal: 'true',
          [`${namespace}.id`]: identifierMock.generateId(),
          [`${namespace}.project`]: RunnerServiceEnum.MYST_CONNECT,
          [`${namespace}.create-by`]: 'api',
          [`${namespace}.myst-identity-model.id`]: outputMystIdentityValid.id,
          [`${namespace}.myst-identity-model.identity`]: outputMystIdentityValid.identity,
          [`${namespace}.vpn-provider-model.id`]: outputVpnProviderValid.id,
          [`${namespace}.vpn-provider-model.user-identity`]: outputVpnProviderValid.userIdentity,
          [`${namespace}.vpn-provider-model.provider-identity`]: outputVpnProviderValid.providerIdentity,
        },
        Env: expect.arrayContaining([
          `MYST_API_BASE_ADDRESS=https://127.0.0.1:4050`,
          `MYST_IDENTITY=${outputMystIdentityValid.identity}`,
          `PROVIDER_IDENTITY=${outputVpnProviderValid.providerIdentity}`,
          `REDIS_HOST=${redisHost}`,
          `REDIS_PORT=${redisPort}`,
          `REDIS_DB=${redisDb}`,
          `REDIS_PROVIDER_INFO_KEY=myst_provider:info:all`,
        ]),
        HostConfig: {
          Binds: expect.arrayContaining([
            `/etc/localtime:/etc/localtime:ro`,
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
      expect(result).toMatchObject<RunnerModel<[MystIdentityModel, VpnProviderModel]>>({
        id: identifierMock.generateId(),
        serial: outputCreateContainer.id,
        name: RunnerServiceEnum.MYST_CONNECT,
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.NONE,
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
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
    });
  });
});
