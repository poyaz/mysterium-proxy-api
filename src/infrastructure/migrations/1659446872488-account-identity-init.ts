import {MigrationInterface, QueryRunner, Table, TableIndex} from 'typeorm';
import {ACCOUNT_IDENTITY_ENTITY_OPTIONS} from '@src-infrastructure/entity/account-identity.entity';

export class accountIdentityInit1659446872488 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: ACCOUNT_IDENTITY_ENTITY_OPTIONS.tableName,
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            primaryKeyConstraintName: ACCOUNT_IDENTITY_ENTITY_OPTIONS.primaryKeyName.id,
          },
          {
            name: 'identity',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'passphrase',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'path',
            type: 'text',
          },
          {
            name: 'insert_date',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'update_date',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'delete_date',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createIndex(ACCOUNT_IDENTITY_ENTITY_OPTIONS.tableName, new TableIndex({
      name: ACCOUNT_IDENTITY_ENTITY_OPTIONS.uniqueName.identity,
      columnNames: ['identity'],
      isUnique: true,
      where: 'delete_date ISNULL',
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(ACCOUNT_IDENTITY_ENTITY_OPTIONS.tableName, ACCOUNT_IDENTITY_ENTITY_OPTIONS.uniqueName.identity);
    await queryRunner.dropTable(ACCOUNT_IDENTITY_ENTITY_OPTIONS.tableName);
  }
}
