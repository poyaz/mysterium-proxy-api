import {Logger, Module} from '@nestjs/common';
import {UuidIdentifier} from '@src-infrastructure/system/uuid-identifier';
import {NullUuidIdentifier} from '@src-infrastructure/system/null-uuid-identifier';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {UsersService} from '@src-core/service/users.service';
import {IUsersServiceInterface} from '@src-core/interface/i-users-service.interface';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {APP_GUARD, APP_INTERCEPTOR, Reflector} from '@nestjs/core';
import {JwtAuthGuard} from '@src-api/http/guard/jwt-auth.guard';
import {FakeAuthGuard} from '@src-api/http/guard/fake-auth.guard';
import {EnvironmentEnv} from '@src-loader/configure/enum/environment.env';
import {OutputTransferInterceptor} from '@src-api/http/interceptor/output.transfer.interceptor';
import {IDateTime} from '@src-core/interface/i-date-time.interface';
import {DateTime} from './infrastructure/system/date-time';
import {PgModule} from '@src-loader/database/pg.module';
import {ConfigureModule} from '@src-loader/configure/configure.module';
import {getRepositoryToken, TypeOrmModule} from '@nestjs/typeorm';
import {controllersExport} from '@src-api/http/controller.export';
import {PgConfigService} from '@src-loader/database/pg-config.service';
import {UsersPgRepository} from '@src-infrastructure/repository/users-pg.repository';
import {UsersEntity} from '@src-infrastructure/entity/users.entity';
import {JwtModule, JwtService} from '@nestjs/jwt';
import {AuthService} from '@src-core/service/auth.service';
import {JwtStrategy} from '@src-api/http/auth/jwt.strategy';
import {Repository} from 'typeorm';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {UsersModel} from '@src-core/model/users.model';
import {HtpasswdConfigInterface} from '@src-loader/configure/interface/htpasswd-config.interface';
import {UsersHtpasswdFileRepository} from '@src-infrastructure/repository/users-htpasswd-file.repository';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {RedisModule, RedisService} from '@liaoliaots/nestjs-redis';
import {RedisConfigInterface} from '@src-loader/configure/interface/redis-config.interface';
import {MulterModule} from '@nestjs/platform-express';
import {ServerConfigInterface} from '@src-loader/configure/interface/server-config.interface';
import {MystIdentityService} from '@src-core/service/myst-identity.service';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {IMystApiRepositoryInterface} from '@src-core/interface/i-myst-api-repository.interface';
import {IRunnerServiceInterface} from '@src-core/interface/i-runner-service.interface';
import {SystemInfoRepository} from '@src-infrastructure/system/system-info.repository';
import {DockerModule} from './module/docker/docker.module';
import {DockerConfigInterface} from '@src-loader/configure/interface/docker-config.interface';
import {DockerOptions} from 'dockerode';
import {UsersAdapterRepository} from '@src-infrastructure/repository/users-adapter.repository';
import {IUsersHtpasswdFileInterface} from '@src-core/interface/i-users-htpasswd-file.interface';
import {MystProviderCacheApiRepository} from '@src-infrastructure/repository/myst-provider-cache-api.repository';
import {MystProviderApiRepository} from '@src-infrastructure/repository/myst-provider-api.repository';
import {MystConfigInterface} from '@src-loader/configure/interface/myst-config.interface';
import {MystProviderAggregateRepository} from '@src-infrastructure/repository/myst-provider-aggregate.repository';
import {DockerService} from './module/docker/docker.service';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {DockerRunnerRepository} from '@src-infrastructure/repository/docker-runner.repository';
import {ICreateRunnerRepository} from '@src-core/interface/i-create-runner-repository';
import {DockerRunnerCreateStrategyRepository} from '@src-infrastructure/repository/docker-runner-create-strategy.repository';
import {DockerRunnerCreateMystRepository} from '@src-infrastructure/repository/docker-runner-create-myst.repository';
import {DockerRunnerCreateMystConnectRepository} from '@src-infrastructure/repository/docker-runner-create-myst-connect.repository';
import {MystIdentityPgRepository} from '@src-infrastructure/repository/myst-identity-pg.repository';
import {AccountIdentityEntity} from '@src-infrastructure/entity/account-identity.entity';
import {MystIdentityFileRepository} from '@src-infrastructure/repository/myst-identity-file.repository';
import {MystIdentityAggregateRepository} from '@src-infrastructure/repository/myst-identity-aggregate.repository';
import {IAccountIdentityFileRepository} from '@src-core/interface/i-account-identity-file.repository';
import {MystProviderService} from '@src-core/service/myst-provider.service';
import {IMystIdentityServiceInterface} from '@src-core/interface/i-myst-identity-service.interface';
import {DockerRunnerService} from '@src-core/service/docker-runner.service';

@Module({
  imports: [
    ConfigureModule,
    PgModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useClass: PgConfigService,
    }),
    TypeOrmModule.forFeature([UsersEntity, AccountIdentityEntity]),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        closeClient: true,
        config: configService.get<RedisConfigInterface>('redis'),
      }),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET_KEY'),
      }),
    }),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        dest: configService.get<ServerConfigInterface>('server').uploadPath,
      }),
    }),
    DockerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dockerConfig = configService.get<DockerConfigInterface>('docker');

        return {
          protocol: <DockerOptions['protocol']>dockerConfig.protocol,
          host: dockerConfig.host,
          port: dockerConfig.port,
        };
      },
    }),
  ],
  controllers: [...controllersExport],
  providers: [
    Logger,
    ConfigService,
    JwtStrategy,
    {
      provide: APP_INTERCEPTOR,
      useClass: OutputTransferInterceptor,
    },
    {
      provide: APP_GUARD,
      inject: [ConfigService, Reflector, Logger],
      useFactory: (configService: ConfigService, reflector: Reflector, logger: Logger) => {
        const NODE_ENV = configService.get<string>('NODE_ENV', '');
        const FAKE_AUTH_GUARD = configService.get<boolean>('FAKE_AUTH_GUARD', false);

        if ((NODE_ENV === '' || NODE_ENV === EnvironmentEnv.DEVELOP) && FAKE_AUTH_GUARD) {
          logger.warn(`Auth guard has been faked because you use "FAKE_AUTH_GUARD=${process.env.FAKE_AUTH_GUARD}" variable!`, 'AuthGuardFactory');
          return new FakeAuthGuard(reflector);
        }

        return new JwtAuthGuard(reflector);
      },
    },

    {
      provide: ProviderTokenEnum.AUTH_SERVICE,
      inject: [ProviderTokenEnum.USER_SERVICE, JwtService],
      useFactory: (usersService: IUsersServiceInterface, jwtService: JwtService) =>
        new AuthService(usersService, jwtService),
    },
    {
      provide: ProviderTokenEnum.DOCKER_RUNNER_SERVICE,
      inject: [ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY],
      useFactory: (dockerRunnerRepository: IRunnerRepositoryInterface) =>
        new DockerRunnerService(dockerRunnerRepository),
    },
    {
      provide: ProviderTokenEnum.MYST_IDENTITY_SERVICE,
      inject: [
        ProviderTokenEnum.MYST_IDENTITY_AGGREGATE_REPOSITORY,
        ProviderTokenEnum.MYST_PROVIDER_AGGREGATE_REPOSITORY,
        ProviderTokenEnum.DOCKER_RUNNER_SERVICE,
      ],
      useFactory: (
        mystIdentityRepository: IGenericRepositoryInterface<MystIdentityModel>,
        mystApiRepository: IMystApiRepositoryInterface,
        runnerService: IRunnerServiceInterface,
      ) => new MystIdentityService(mystIdentityRepository, mystApiRepository, runnerService),
    },
    {
      provide: ProviderTokenEnum.MYST_PROVIDER_SERVICE,
      inject: [
        ProviderTokenEnum.MYST_PROVIDER_AGGREGATE_REPOSITORY,
        ProviderTokenEnum.DOCKER_RUNNER_SERVICE,
        ProviderTokenEnum.MYST_IDENTITY_SERVICE,
      ],
      useFactory: (
        mystApiRepository: IMystApiRepositoryInterface,
        runnerService: IRunnerServiceInterface,
        mystIdentityService: IMystIdentityServiceInterface,
      ) => new MystProviderService(mystApiRepository, runnerService, mystIdentityService),
    },
    {
      provide: ProviderTokenEnum.USER_SERVICE,
      inject: [ProviderTokenEnum.USER_PG_REPOSITORY],
      useFactory: (usersRepository: IGenericRepositoryInterface<UsersModel>) =>
        new UsersService(usersRepository),
    },

    {
      provide: ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY,
      inject: [
        ConfigService,
        DockerService,
        ProviderTokenEnum.DOCKER_RUNNER_CREATE_STRATEGY_REPOSITORY,
      ],
      useFactory: (
        configService: ConfigService,
        docker: DockerService,
        dockerRunnerCreateRepository: ICreateRunnerRepository,
      ) => {
        const DOCKER_CONFIG = configService.get<DockerConfigInterface>('docker');

        return new DockerRunnerRepository(
          docker.getInstance(),
          dockerRunnerCreateRepository,
          {
            baseVolumePath:
              {
                myst: DOCKER_CONFIG.containerInfo.myst.volumes.keystore,
              },
            networkName: DOCKER_CONFIG.networkName,
          },
          DOCKER_CONFIG.labelNamespace,
        );
      },
    },
    {
      provide: ProviderTokenEnum.DOCKER_RUNNER_CREATE_MYST_REPOSITORY,
      inject: [
        ConfigService,
        DockerService,
        ProviderTokenEnum.IDENTIFIER_UUID,
      ],
      useFactory: (
        configService: ConfigService,
        docker: DockerService,
        identity: IIdentifier,
      ) => {
        const DOCKER_CONFIG = configService.get<DockerConfigInterface>('docker');

        return new DockerRunnerCreateMystRepository(
          docker.getInstance(),
          identity,
          {
            imageName: DOCKER_CONFIG.containerInfo.myst.image,
            httpPort: DOCKER_CONFIG.containerInfo.myst.httpPort,
            dataVolumePath: DOCKER_CONFIG.containerInfo.myst.volumes.keystore,
            networkName: DOCKER_CONFIG.networkName,
          },
          DOCKER_CONFIG.labelNamespace,
        );
      },
    },
    {
      provide: ProviderTokenEnum.DOCKER_RUNNER_CREATE_MYST_CONNECT_REPOSITORY,
      inject: [
        ConfigService,
        DockerService,
        ProviderTokenEnum.IDENTIFIER_UUID,
      ],
      useFactory: (
        configService: ConfigService,
        docker: DockerService,
        identity: IIdentifier,
      ) => {
        const DOCKER_CONFIG = configService.get<DockerConfigInterface>('docker');
        const REDIS_CONFIG = configService.get<RedisConfigInterface>('redis');

        return new DockerRunnerCreateMystConnectRepository(
          docker.getInstance(),
          identity,
          {
            imageName: DOCKER_CONFIG.containerInfo.mystConnect.image,
            networkName: DOCKER_CONFIG.networkName,
          },
          {
            host: REDIS_CONFIG.host,
            port: REDIS_CONFIG.port,
            db: REDIS_CONFIG.db,
          },
          DOCKER_CONFIG.labelNamespace,
        );
      },
    },
    {
      provide: ProviderTokenEnum.DOCKER_RUNNER_CREATE_STRATEGY_REPOSITORY,
      inject: [
        ProviderTokenEnum.DOCKER_RUNNER_CREATE_MYST_REPOSITORY,
        ProviderTokenEnum.DOCKER_RUNNER_CREATE_MYST_CONNECT_REPOSITORY,
      ],
      useFactory: (...dockerRunnerCreateList: Array<ICreateRunnerRepository>) =>
        new DockerRunnerCreateStrategyRepository(dockerRunnerCreateList),
    },
    {
      provide: ProviderTokenEnum.MYST_IDENTITY_AGGREGATE_REPOSITORY,
      inject: [
        ProviderTokenEnum.MYST_IDENTITY_FILE_REPOSITORY,
        ProviderTokenEnum.MYST_IDENTITY_PG_REPOSITORY,
        ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY,
      ],
      useFactory: (
        mystIdentityFileRepository: IAccountIdentityFileRepository,
        mystIdentityPgRepository: IGenericRepositoryInterface<MystIdentityModel>,
        dockerRunnerRepository: IRunnerRepositoryInterface,
      ) => new MystIdentityAggregateRepository(
        mystIdentityFileRepository,
        mystIdentityPgRepository,
        dockerRunnerRepository,
      ),
    },
    {
      provide: ProviderTokenEnum.MYST_IDENTITY_FILE_REPOSITORY,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const MYST_CONFIG = configService.get<MystConfigInterface>('myst');

        return new MystIdentityFileRepository(MYST_CONFIG.basePathStore);
      },
    },
    {
      provide: ProviderTokenEnum.MYST_IDENTITY_PG_REPOSITORY,
      inject: [
        getRepositoryToken(AccountIdentityEntity),
        ProviderTokenEnum.IDENTIFIER_UUID,
        ProviderTokenEnum.DATE_TIME,
      ],
      useFactory: (db: Repository<AccountIdentityEntity>, identifier: IIdentifier, date: IDateTime) =>
        new MystIdentityPgRepository(db, identifier, date),
    },
    {
      provide: ProviderTokenEnum.MYST_PROVIDER_AGGREGATE_REPOSITORY,
      inject: [
        ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY,
        ProviderTokenEnum.MYST_PROVIDER_CACHE_API_REPOSITORY,
      ],
      useFactory: (
        dockerRunnerRepository: IRunnerRepositoryInterface,
        mystProviderCacheApiRepository: IMystApiRepositoryInterface,
      ) =>
        new MystProviderAggregateRepository(dockerRunnerRepository, mystProviderCacheApiRepository),
    },
    {
      provide: ProviderTokenEnum.MYST_PROVIDER_API_REPOSITORY,
      inject: [
        ConfigService,
        ProviderTokenEnum.IDENTIFIER_UUID,
        Logger,
      ],
      useFactory: (
        configService: ConfigService,
        identifier: IIdentifier,
        logger: Logger,
      ) => {
        const MYST_CONFIG = configService.get<MystConfigInterface>('myst');

        return new MystProviderApiRepository(
          identifier,
          MYST_CONFIG.discoveryHostAddr,
          MYST_CONFIG.node.auth.username,
          MYST_CONFIG.node.auth.password,
          logger,
        );
      },
    },
    {
      provide: ProviderTokenEnum.MYST_PROVIDER_CACHE_API_REPOSITORY,
      inject: [
        RedisService,
        ProviderTokenEnum.MYST_PROVIDER_API_REPOSITORY,
        Logger,
      ],
      useFactory: (
        redis: RedisService,
        mystProviderApiRepository: IMystApiRepositoryInterface,
        logger: Logger,
      ) => new MystProviderCacheApiRepository(redis, mystProviderApiRepository, logger),
    },
    {
      provide: ProviderTokenEnum.USER_ADAPTER_REPOSITORY,
      inject: [
        ProviderTokenEnum.USER_PG_REPOSITORY,
        ProviderTokenEnum.USERS_HTPASSWD_FILE_REPOSITORY,
      ],
      useFactory: (
        userPgRepository: IGenericRepositoryInterface<UsersModel>,
        usersHtpasswdFileRepository: IUsersHtpasswdFileInterface,
      ) =>
        new UsersAdapterRepository(userPgRepository, usersHtpasswdFileRepository),
    },
    {
      provide: ProviderTokenEnum.USERS_HTPASSWD_FILE_REPOSITORY,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const HTPASSWD_CONFIG = configService.get<HtpasswdConfigInterface>('htpasswd');

        return new UsersHtpasswdFileRepository(HTPASSWD_CONFIG.pwdFile);
      },
    },
    {
      provide: ProviderTokenEnum.USER_PG_REPOSITORY,
      inject: [
        getRepositoryToken(UsersEntity),
        ProviderTokenEnum.IDENTIFIER_UUID,
        ProviderTokenEnum.DATE_TIME,
      ],
      useFactory: (db: Repository<UsersEntity>, identifier: IIdentifier, dateTime: IDateTime) =>
        new UsersPgRepository(db, identifier, dateTime),
    },

    {
      provide: ProviderTokenEnum.DATE_TIME,
      useClass: DateTime,
    },
    {
      provide: ProviderTokenEnum.IDENTIFIER_UUID,
      useFactory: () => new UuidIdentifier(),
    },
    {
      provide: ProviderTokenEnum.SYSTEM_INFO_REPOSITORY,
      inject: [],
      useFactory: () => new SystemInfoRepository(),
    },
    {
      provide: ProviderTokenEnum.IDENTIFIER_UUID_NULL,
      useClass: NullUuidIdentifier,
    },
  ],
})
export class AppModule {
}
