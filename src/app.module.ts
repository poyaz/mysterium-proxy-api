import {Module} from '@nestjs/common';
import {UuidIdentifier} from './infrastructure/system/uuid-identifier';
import {NullUuidIdentifier} from './infrastructure/system/null-uuid-identifier';
import {I_IDENTIFIER, IIdentifier} from './core/interface/i-identifier.interface';
import {UsersService} from './core/service/users.service';
import {I_USER_SERVICE, IUsersServiceInterface} from './core/interface/i-users-service.interface';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {APP_GUARD, APP_INTERCEPTOR, Reflector} from '@nestjs/core';
import {JwtAuthGuard} from './api/http/guard/jwt-auth.guard';
import {FakeAuthGuard} from './api/http/guard/fake-auth.guard';
import {EnvironmentEnv} from './loader/configure/enum/environment.env';
import {OutputTransferInterceptor} from './api/http/interceptor/output.transfer.interceptor';
import {I_DATE_TIME, IDateTime} from './core/interface/i-date-time.interface';
import {DateTime} from './infrastructure/system/date-time';
import {PgModule} from './loader/database/pg.module';
import {InterfaceRepositoryEnum} from './core/enum/interface-repository.enum';
import {ConfigureModule} from './loader/configure/configure.module';
import {getRepositoryToken, TypeOrmModule} from '@nestjs/typeorm';
import {controllersExport} from './loader/http/controller.export';
import {PgConfigService} from './loader/database/pg-config.service';
import {UsersPgRepository} from './infrastructure/repository/users-pg.repository';
import {UsersEntity} from './infrastructure/entity/users.entity';
import {I_AUTH_SERVICE} from './core/interface/i-auth-service.interface';
import {JwtModule, JwtService} from '@nestjs/jwt';
import {AuthService} from './core/service/auth.service';
import {JwtStrategy} from './api/http/auth/jwt.strategy';
import {Repository} from 'typeorm';
import {IGenericRepositoryInterface} from './core/interface/i-generic-repository.interface';
import {UsersModel} from './core/model/users.model';
import {SquidConfigInterface} from './loader/configure/interface/squid-config.interface';
import {UsersSquidFileRepository} from './infrastructure/repository/users-squid-file.repository';

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
      provide: I_IDENTIFIER.DEFAULT,
      useClass: UuidIdentifier,
    },
    {
      provide: I_IDENTIFIER.NULL,
      useClass: NullUuidIdentifier,
    },
    {
      provide: I_DATE_TIME.DEFAULT,
      useClass: DateTime,
    },
    {
      provide: I_USER_SERVICE.DEFAULT,
      inject: [InterfaceRepositoryEnum.USER_PG_REPOSITORY],
      useFactory: (usersRepository: IGenericRepositoryInterface<UsersModel>) =>
        new UsersService(usersRepository),
    },
    {
      provide: I_AUTH_SERVICE.DEFAULT,
      inject: [I_USER_SERVICE.DEFAULT, JwtService],
      useFactory: (usersService: IUsersServiceInterface, jwtService: JwtService) =>
        new AuthService(usersService, jwtService),
    },
    {
      provide: InterfaceRepositoryEnum.USER_PG_REPOSITORY,
      inject: [getRepositoryToken(UsersEntity), I_IDENTIFIER.DEFAULT, I_DATE_TIME.DEFAULT],
      useFactory: (db: Repository<UsersEntity>, identifier: IIdentifier, dateTime: IDateTime) =>
        new UsersPgRepository(db, identifier, dateTime),
    },
    {
      provide: InterfaceRepositoryEnum.USERS_SQUID_FILE_REPOSITORY,
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
