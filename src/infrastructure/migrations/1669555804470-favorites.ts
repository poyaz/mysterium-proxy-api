import {MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex} from 'typeorm';
import {FAVORITES_ENTITY_OPTIONS} from '@src-infrastructure/entity/favorites.entity';
import {USERS_ENTITY_OPTIONS} from '@src-infrastructure/entity/users.entity';
import {FavoritesListTypeEnum} from '@src-core/model/favorites.model';

export class favorites1669555804470 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: FAVORITES_ENTITY_OPTIONS.tableName,
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            primaryKeyConstraintName: FAVORITES_ENTITY_OPTIONS.primaryKeyName.id,
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'kind',
            type: 'enum',
            enumName: FAVORITES_ENTITY_OPTIONS.enumName.kind,
            enum: [FavoritesListTypeEnum.FAVORITE, FavoritesListTypeEnum.TODAY],
          },
          {
            name: 'proxy_id',
            type: 'uuid',
          },
          {
            name: 'note',
            type: 'text',
            isNullable: true,
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

    await queryRunner.createIndex(FAVORITES_ENTITY_OPTIONS.tableName, new TableIndex({
      name: FAVORITES_ENTITY_OPTIONS.uniqueName.proxyId,
      columnNames: ['proxy_id'],
      isUnique: true,
      where: 'delete_date ISNULL',
    }));

    await queryRunner.createForeignKey(FAVORITES_ENTITY_OPTIONS.tableName, new TableForeignKey({
      name: FAVORITES_ENTITY_OPTIONS.foreignKeyName.usersId,
      columnNames: ['user_id'],
      referencedTableName: USERS_ENTITY_OPTIONS.tableName,
      referencedColumnNames: ['id'],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(FAVORITES_ENTITY_OPTIONS.tableName, FAVORITES_ENTITY_OPTIONS.foreignKeyName.usersId);
    await queryRunner.dropIndex(FAVORITES_ENTITY_OPTIONS.tableName, FAVORITES_ENTITY_OPTIONS.uniqueName.proxyId);
    await queryRunner.dropTable(FAVORITES_ENTITY_OPTIONS.tableName);
    await queryRunner.query(`DROP TYPE ${FAVORITES_ENTITY_OPTIONS.enumName.kind}`);
  }
}
