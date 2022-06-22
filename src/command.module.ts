import {Module} from '@nestjs/common';
import {SwaggerCommand} from './api/command/swagger/swagger.command';
import {ConfigureModule} from './loader/configure/configure.module';
import {PgModule} from './loader/database/pg.module';
import {I_USER_SERVICE} from './core/interface/i-users-service.interface';
import {controllersExport} from './loader/http/controller.export';
import {MigrationRunCommand, MigrationUndoCommand} from './api/command/migration/migration.command';
import {PgConfigService} from './loader/database/pg-config.service';

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
      provide: I_USER_SERVICE.DEFAULT,
      useFactory: () => () => ({}),
    },
  ],
  exports: [],
})
export class CommandModule {
}
