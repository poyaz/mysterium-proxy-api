import {Module} from '@nestjs/common';
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
import {DateTime} from "./infrastructure/system/date-time";
import {PgModule} from '@src-loader/database/pg.module';
import {ConfigureModule} from '@src-loader/configure/configure.module';
import {getRepositoryToken, TypeOrmModule} from '@nestjs/typeorm';
import {controllersExport} from '@src-loader/http/controller.export';
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
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET_KEY'),
      }),
    }),
  ],
  controllers: [...controllersExport],
  providers: [
    ConfigService,
    JwtStrategy,
    {
      provide: APP_INTERCEPTOR,
      useClass: OutputTransferInterceptor,
    },
    {
      provide: APP_GUARD,
      inject: [ConfigService, Reflector],
      useFactory: (configService: ConfigService, reflector: Reflector) => {
        const NODE_ENV = configService.get<string>('NODE_ENV', '');

        return NODE_ENV === '' || NODE_ENV === EnvironmentEnv.DEVELOP
          ? new FakeAuthGuard(reflector)
          : new JwtAuthGuard(reflector);
      },
    },
    {
      provide: ProviderTokenEnum.IDENTIFIER_UUID,
      useClass: UuidIdentifier,
    },
    {
      provide: ProviderTokenEnum.IDENTIFIER_UUID_NULL,
      useClass: NullUuidIdentifier,
    },
    {
      provide: ProviderTokenEnum.DATE_TIME_DEFAULT,
      useClass: DateTime,
    },
    {
      provide: ProviderTokenEnum.USER_SERVICE_DEFAULT,
      inject: [ProviderTokenEnum.USER_PG_REPOSITORY],
      useFactory: (usersRepository: IGenericRepositoryInterface<UsersModel>) =>
        new UsersService(usersRepository),
    },
    {
      provide: ProviderTokenEnum.AUTH_SERVICE_DEFAULT,
      inject: [ProviderTokenEnum.USER_SERVICE_DEFAULT, JwtService],
      useFactory: (usersService: IUsersServiceInterface, jwtService: JwtService) =>
        new AuthService(usersService, jwtService),
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
  ],
})
export class AppModule {
}
