import {Module} from '@nestjs/common';
import {SwaggerCommand} from '@src-api/command/swagger/swagger.command';
import {ConfigureModule} from '@src-loader/configure/configure.module';
import {PgModule} from '@src-loader/database/pg.module';
import {controllersExport} from '@src-loader/http/controller.export';
import {MigrationRunCommand, MigrationUndoCommand} from '@src-api/command/migration/migration.command';
import {PgConfigService} from '@src-loader/database/pg-config.service';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';

@Module({
  imports: [ConfigureModule, PgModule],
  controllers: [...controllersExport],
  providers: [
    SwaggerCommand,
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
      provide: ProviderTokenEnum.USER_SERVICE_DEFAULT,
      useFactory: () => () => ({}),
    },
    {
      provide: ProviderTokenEnum.AUTH_SERVICE_DEFAULT,
      useFactory: () => () => ({}),
    },
  ],
  exports: [],
})
export class CommandModule {
}
