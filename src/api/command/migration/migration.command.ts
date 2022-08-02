import {Command, CommandRunner} from 'nest-commander';
import {TypeOrmOptionsFactory} from '@nestjs/typeorm';
import {DataSource} from 'typeorm';
import {DataSourceOptions} from 'typeorm/data-source/DataSourceOptions';
import {spawn} from 'child_process';

@Command({
  name: 'migration:create',
  description: 'Create migration file',
  arguments: '<name>',
  argsDescription: {
    name: 'The name of migration file',
  },
})
export class MigrationCreateCommand implements CommandRunner {
  constructor(
    private readonly _dataSourceFactory: TypeOrmOptionsFactory,
  ) {
  }

  async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    const config = <DataSourceOptions>this._dataSourceFactory.createTypeOrmOptions();
    if (config.migrations.length === 0) {
      process.exit(1);
    }

    const [name] = passedParams;

    const migrationDir = config.migrations[0].split(/\//g).slice(0, -1).map((v) => v === 'dist' ? 'src' : v).join('/');

    const exec = spawn('./node_modules/.bin/typeorm', ['migration:create', `${migrationDir}/${name}`]);

    exec.stderr.pipe(process.stdout);
    exec.stdout.pipe(process.stdout);

    exec.on('exit', (code) => {
      process.exit(code);
    });
  }
}

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
