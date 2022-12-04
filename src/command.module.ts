import {Module} from '@nestjs/common';
import {SwaggerCommand} from '@src-api/command/swagger/swagger.command';
import {ConfigureModule} from '@src-loader/configure/configure.module';
import {PgModule} from '@src-loader/database/pg.module';
import {controllersExport} from '@src-api/http/controller.export';
import {
  MigrationCreateCommand,
  MigrationRunCommand,
  MigrationUndoCommand,
} from '@src-api/command/migration/migration.command';
import {PgConfigService} from '@src-loader/database/pg-config.service';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {UsersCreateCommand} from '@src-api/command/users/users.command';
import {getRepositoryToken, TypeOrmModule} from '@nestjs/typeorm';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {UsersEntity} from '@src-infrastructure/entity/users.entity';
import {AccountIdentityEntity} from '@src-infrastructure/entity/account-identity.entity';
import {FavoritesEntity} from '@src-infrastructure/entity/favorites.entity';
import {DateTime} from '@src-infrastructure/system/date-time';
import {UuidIdentifier} from '@src-infrastructure/system/uuid-identifier';
import {SystemInfoRepository} from '@src-infrastructure/system/system-info.repository';
import {NullUuidIdentifier} from '@src-infrastructure/system/null-uuid-identifier';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {UsersModel} from '@src-core/model/users.model';
import {IUsersHtpasswdFileInterface} from '@src-core/interface/i-users-htpasswd-file.interface';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {UsersAdapterRepository} from '@src-infrastructure/repository/users-adapter.repository';
import {HtpasswdConfigInterface} from '@src-loader/configure/interface/htpasswd-config.interface';
import {UsersHtpasswdFileRepository} from '@src-infrastructure/repository/users-htpasswd-file.repository';
import {Repository} from 'typeorm';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {IDateTime} from '@src-core/interface/i-date-time.interface';
import {UsersPgRepository} from '@src-infrastructure/repository/users-pg.repository';
import {UsersService} from '@src-core/service/users.service';
import {IUsersServiceInterface} from '@src-core/interface/i-users-service.interface';
import {DockerService} from './module/docker/docker.service';
import {DockerConfigInterface} from '@src-loader/configure/interface/docker-config.interface';
import {DockerRunnerRepository} from '@src-infrastructure/repository/docker-runner.repository';
import {DockerModule} from './module/docker/docker.module';
import {DockerOptions} from 'dockerode';

@Module({
  imports: [
    ConfigureModule,
    PgModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useClass: PgConfigService,
      extraProviders: [
        {
          provide: 'USE_CLI',
          useValue: true,
        },
        {
          provide: 'pgDataSource',
          useValue: () => ({}),
        },
      ],
    }),
    TypeOrmModule.forFeature([UsersEntity]),
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
    ConfigService,

    SwaggerCommand,
    {
      provide: MigrationCreateCommand,
      useFactory: (connection) => {
        return new MigrationCreateCommand(connection);
      },
      inject: [PgConfigService],
    },
    {
      provide: MigrationRunCommand,
      useFactory: (connection) => {
        return new MigrationRunCommand(connection);
      },
      inject: [PgConfigService],
    },
    {
      provide: MigrationUndoCommand,
      useFactory: (connection) => {
        return new MigrationUndoCommand(connection);
      },
      inject: [PgConfigService],
    },
    {
      provide: UsersCreateCommand,
      inject: [ProviderTokenEnum.USER_SERVICE],
      useFactory: (userService: IUsersServiceInterface) => {
        return new UsersCreateCommand(userService);
      },
    },

    {
      provide: ProviderTokenEnum.CAN_ANONYMOUS_REGISTER,
      useValue: false,
    },

    {
      provide: ProviderTokenEnum.AUTH_SERVICE_DEFAULT,
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.FAVORITES_SERVICE_DEFAULT,
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.MYST_IDENTITY_SERVICE_DEFAULT,
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.MYST_PROVIDER_SERVICE_DEFAULT,
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.MYST_PROVIDER_PROXY_SERVICE_DEFAULT,
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.PROXY_SERVICE_DEFAULT,
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.PROXY_ACL_SERVICE_DEFAULT,
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.USER_SERVICE_DEFAULT,
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.USERS_PROXY_SERVICE_DEFAULT,
      useValue: () => ({}),
    },

    {
      provide: ProviderTokenEnum.USER_SERVICE,
      inject: [ProviderTokenEnum.USER_ADAPTER_REPOSITORY],
      useFactory: (usersRepository: IGenericRepositoryInterface<UsersModel>) => new UsersService(usersRepository),
    },

    {
      provide: ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY,
      inject: [
        ConfigService,
        DockerService,
      ],
      useFactory: (
        configService: ConfigService,
        docker: DockerService,
      ) => {
        const DOCKER_CONFIG = configService.get<DockerConfigInterface>('docker');

        return new DockerRunnerRepository(
          docker.getInstance(),
          null,
          {
            baseVolumePath:
              {
                myst: DOCKER_CONFIG.containerInfo.myst.volumes.keystore,
              },
            defaultPort: {envoy: DOCKER_CONFIG.containerInfo.envoy.tcpPort},
            networkName: DOCKER_CONFIG.networkName,
            realPath: DOCKER_CONFIG.realProjectPath,
          },
          DOCKER_CONFIG.labelNamespace,
        );
      },
    },
    {
      provide: ProviderTokenEnum.USER_ADAPTER_REPOSITORY,
      inject: [
        ProviderTokenEnum.USERS_PG_REPOSITORY,
        ProviderTokenEnum.USERS_HTPASSWD_FILE_REPOSITORY,
        ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY,
      ],
      useFactory: (
        userPgRepository: IGenericRepositoryInterface<UsersModel>,
        usersHtpasswdFileRepository: IUsersHtpasswdFileInterface,
        dockerRunnerRepository: IRunnerRepositoryInterface,
      ) =>
        new UsersAdapterRepository(userPgRepository, usersHtpasswdFileRepository, dockerRunnerRepository),
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
      provide: ProviderTokenEnum.USERS_PG_REPOSITORY,
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
  ],
  exports: [],
})
export class CommandModule {
}
