import {MigrationInterface, QueryRunner, Table, TableIndex} from 'typeorm';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';
import {USERS_ENTITY_OPTIONS} from '@src-infrastructure/entity/users.entity';

export class usersInit1655809420675 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: USERS_ENTITY_OPTIONS.tableName,
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            primaryKeyConstraintName: USERS_ENTITY_OPTIONS.primaryKeyName.id,
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
            enumName: USERS_ENTITY_OPTIONS.enumName.role,
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

    await queryRunner.createIndex(USERS_ENTITY_OPTIONS.tableName, new TableIndex({
      name: USERS_ENTITY_OPTIONS.uniqueName.username,
      columnNames: ['username'],
      isUnique: true,
      where: 'delete_date ISNULL',
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(USERS_ENTITY_OPTIONS.tableName, USERS_ENTITY_OPTIONS.uniqueName.username);
    await queryRunner.dropTable(USERS_ENTITY_OPTIONS.tableName);
    await queryRunner.query(`DROP TYPE ${USERS_ENTITY_OPTIONS.enumName.role}`);
  }
}
