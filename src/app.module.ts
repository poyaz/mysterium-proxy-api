import {Module} from '@nestjs/common';
import {UuidIdentifier} from './infrastructure/system/uuid-identifier';
import {NullUuidIdentifier} from './infrastructure/system/null-uuid-identifier';
import {I_IDENTIFIER} from './core/interface/i-identifier.interface';
import {UsersService} from './core/service/users.service';
import {I_USER_SERVICE} from './core/interface/i-users-service.interface';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {APP_GUARD, APP_INTERCEPTOR, Reflector} from '@nestjs/core';
import {AuthGuard} from './api/http/guard/auth.guard';
import {FakeAuthGuard} from './api/http/guard/fake-auth.guard';
import {EnvironmentEnv} from './loader/configure/enum/environment.env';
import {OutputTransferInterceptor} from './api/http/interceptor/output.transfer.interceptor';
import {I_DATE_TIME} from './core/interface/i-date-time.interface';
import {DateTime} from './infrastructure/system/date-time';
import {PgModule} from './loader/database/pg.module';
import {UsersPgRepositoryService} from './infrastructure/repository/users-pg-repository.service';
import {InterfaceRepositoryEnum} from './core/enum/interface-repository.enum';
import {ConfigureModule} from './loader/configure/configure.module';
import {TypeOrmModule} from '@nestjs/typeorm';
import {controllersExport} from './loader/http/controller.export';
import {PgConfigService} from './loader/database/pg-config.service';

@Module({
  imports: [
    ConfigureModule,
    PgModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useClass: PgConfigService,
    }),
  ],
  controllers: [...controllersExport],
  providers: [
    ConfigService,
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
          : new AuthGuard(reflector);
      },
    },
    UuidIdentifier,
    NullUuidIdentifier,
    {
      provide: I_IDENTIFIER.DEFAULT,
      useClass: UuidIdentifier,
    },
    {
      provide: I_IDENTIFIER.NULL,
      useClass: NullUuidIdentifier,
    },
    {
      provide: I_USER_SERVICE.DEFAULT,
      useClass: UsersService,
    },
    {
      provide: I_DATE_TIME.DEFAULT,
      useClass: DateTime,
    },
    {
      provide: InterfaceRepositoryEnum.USER_PG_REPOSITORY,
      useClass: UsersPgRepositoryService,
    },
  ],
})
export class AppModule {
}
