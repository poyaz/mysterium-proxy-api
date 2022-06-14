import {Module} from '@nestjs/common';
import {UuidIdentifier} from './infrastructure/system/uuid-identifier';
import {NullUuidIdentifier} from './infrastructure/system/null-uuid-identifier';
import {I_IDENTIFIER} from './core/interface/i-identifier.interface';
import {UsersHttpController} from './api/http/controller/users/users.http.controller';
import {UsersService} from './core/service/users.service';
import {I_USER_SERVICE} from './core/interface/i-users-service.interface';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {resolve} from 'path';
import {envValidate} from './loader/configure/validate/env.validation';
import serverConfig from './loader/configure/config/server.config';
import {APP_GUARD, APP_INTERCEPTOR, Reflector} from '@nestjs/core';
import {AuthGuard} from './api/http/guard/auth.guard';
import {FakeAuthGuard} from './api/http/guard/fake-auth.guard';
import {EnvironmentEnv} from './loader/configure/enum/environment.env';
import {CommandModule} from './command.module';
import {OutputTransferInterceptor} from './api/http/interceptor/output.transfer.interceptor';
import {I_DATE_TIME} from './core/interface/i-date-time.interface';
import {DateTime} from './infrastructure/system/date-time';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: resolve(__dirname, '..', 'env', 'app', '.env'),
      validate: envValidate,
      load: [serverConfig],
    }),
    CommandModule,
  ],
  controllers: [
    UsersHttpController,
  ],
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
  ],
})

export class AppModule {
}
