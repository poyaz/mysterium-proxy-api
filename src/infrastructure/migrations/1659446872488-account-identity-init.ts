import {MigrationInterface, QueryRunner, Table, TableIndex} from 'typeorm';

const TABLE_NAME = 'account_identity';
const UNIQUE_INDEX_IDENTITY = 'account_identity_identity_unique_idx';

export class accountIdentityInit1659446872488 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_NAME,
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
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

    await queryRunner.createIndex(TABLE_NAME, new TableIndex({
      name: UNIQUE_INDEX_IDENTITY,
      columnNames: ['identity'],
      isUnique: true,
      where: 'delete_date ISNULL',
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(TABLE_NAME, UNIQUE_INDEX_IDENTITY);
    await queryRunner.dropTable(TABLE_NAME);
  }

}
