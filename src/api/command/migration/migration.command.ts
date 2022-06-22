import {Command, CommandRunner} from 'nest-commander';
import {TypeOrmOptionsFactory} from '@nestjs/typeorm';
import {DataSource} from 'typeorm';
import {DataSourceOptions} from 'typeorm/data-source/DataSourceOptions';

@Command({name: 'migration:run', description: 'Run migration file in database'})
export class MigrationRunCommand implements CommandRunner {
  constructor(
    private readonly _dataSourceFactory: TypeOrmOptionsFactory,
  ) {
  }

  async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    const dataSource = new DataSource(this._dataSourceFactory.createTypeOrmOptions() as DataSourceOptions);
    const source = await dataSource.initialize();
    await source.runMigrations();
    process.exit(0);
  }
}

@Command({name: 'migration:undo', description: 'Run migration file in database'})
export class MigrationUndoCommand implements CommandRunner {
  constructor(
    private readonly _dataSourceFactory: TypeOrmOptionsFactory,
  ) {
  }

  async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    const dataSource = new DataSource(this._dataSourceFactory.createTypeOrmOptions() as DataSourceOptions);
    const source = await dataSource.initialize();
    await source.undoLastMigration();
    process.exit(0);
  }
}
