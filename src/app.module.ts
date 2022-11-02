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
import {SquidConfigInterface} from '@src-loader/configure/interface/squid-config.interface';
import {UsersSquidFileRepository} from '@src-infrastructure/repository/users-squid-file.repository';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {RedisModule} from '@liaoliaots/nestjs-redis';
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

@Module({
  imports: [
    ConfigureModule,
    PgModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useClass: PgConfigService,
    }),
    TypeOrmModule.forFeature([UsersEntity]),
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
          protocol: <DockerOptions["protocol"]>dockerConfig.protocol,
          host: dockerConfig.host,
          port: dockerConfig.host,
        }
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
      inject: [],
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.MYST_IDENTITY_SERVICE,
      inject: [
        ProviderTokenEnum.MYST_IDENTITY_AGGREGATE_REPOSITORY,
        ProviderTokenEnum.MYST_PROVIDER_API_REPOSITORY,
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
      inject: [],
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.MYST_PROVIDER_SERVICE,
      inject: [],
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.USER_SERVICE,
      inject: [ProviderTokenEnum.USER_PG_REPOSITORY],
      useFactory: (usersRepository: IGenericRepositoryInterface<UsersModel>) =>
        new UsersService(usersRepository),
    },

    {
      provide: ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY,
      inject: [],
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.DOCKER_RUNNER_CREATE_MYST_REPOSITORY,
      inject: [],
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.DOCKER_RUNNER_CREATE_MYST_CONNECT_REPOSITORY,
      inject: [],
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.DOCKER_RUNNER_CREATE_STRATEGY_REPOSITORY,
      inject: [],
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.MYST_PROVIDER_AGGREGATE_REPOSITORY,
      inject: [],
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.MYST_PROVIDER_API_REPOSITORY,
      inject: [],
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.MYST_PROVIDER_CACHE_ID_API_REPOSITORY,
      inject: [],
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.MYST_IDENTITY_AGGREGATE_REPOSITORY,
      inject: [],
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.MYST_IDENTITY_FILE_REPOSITORY,
      inject: [],
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.MYST_IDENTITY_PG_REPOSITORY,
      inject: [],
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.USER_ADAPTER_REPOSITORY,
      inject: [],
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.USER_PG_REPOSITORY,
      inject: [getRepositoryToken(UsersEntity), ProviderTokenEnum.IDENTIFIER_UUID, ProviderTokenEnum.DATE_TIME_DEFAULT],
      useFactory: (db: Repository<UsersEntity>, identifier: IIdentifier, dateTime: IDateTime) =>
        new UsersPgRepository(db, identifier, dateTime),
    },
    {
      provide: ProviderTokenEnum.USERS_SQUID_FILE_REPOSITORY,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const SQUID_CONFIG = configService.get<SquidConfigInterface>('squid');

        return new UsersSquidFileRepository(SQUID_CONFIG.pwdFile);
      },
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
