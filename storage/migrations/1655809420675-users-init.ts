import {MigrationInterface, QueryRunner, Table, TableIndex} from 'typeorm';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';

const TABLE_NAME = 'users';
const UNIQUE_INDEX_USERNAME = 'users_username_unique_idx';

export class usersInit1655809420675 implements MigrationInterface {

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
            name: 'username',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'password',
            type: 'varchar',
            length: '225',
          },
          {
            name: 'role',
            type: 'enum',
            enum: Object.values(UserRoleEnum),
          },
          {
            name: 'is_enable',
            type: 'boolean',
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
      name: UNIQUE_INDEX_USERNAME,
      columnNames: ['username'],
      isUnique: true,
      where: 'delete_date ISNULL',
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(TABLE_NAME, UNIQUE_INDEX_USERNAME);
    await queryRunner.dropTable(TABLE_NAME);
  }

}
