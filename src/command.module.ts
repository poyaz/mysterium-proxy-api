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

@Module({
  imports: [ConfigureModule, PgModule],
  controllers: [...controllersExport],
  providers: [
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
      provide: ProviderTokenEnum.CAN_ANONYMOUS_REGISTER,
      useValue: false,
    },

    {
      provide: ProviderTokenEnum.AUTH_SERVICE_DEFAULT,
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
      provide: ProviderTokenEnum.USER_SERVICE_DEFAULT,
      useFactory: () => ({}),
    },
    {
      provide: ProviderTokenEnum.USERS_PROXY_SERVICE_DEFAULT,
      useValue: () => ({}),
    },
  ],
  exports: [],
})
export class CommandModule {
}
