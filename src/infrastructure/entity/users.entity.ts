import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity, Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';
import {Exclude} from 'class-transformer';

const ENTITY_PREFIX = 'users';
export const USERS_ENTITY_OPTIONS = {
  tableName: ENTITY_PREFIX,
  primaryKeyName: {
    id: `${ENTITY_PREFIX}_id_pk`,
  },
  uniqueName: {
    username: `${ENTITY_PREFIX}_username_unique_idx`,
  },
  enumName: {
    role: `${ENTITY_PREFIX}_role_enum`,
  },
};

@Entity({name: USERS_ENTITY_OPTIONS.tableName})
export class UsersEntity extends BaseEntity {
  @PrimaryColumn({type: 'uuid', primaryKeyConstraintName: USERS_ENTITY_OPTIONS.primaryKeyName.id})
  id: string;

  @Column({type: 'varchar', length: 100})
  @Index(USERS_ENTITY_OPTIONS.uniqueName.username, {unique: true, where: 'delete_date ISNULL'})
  username: string;

  @Column({type: 'varchar', length: 225})
  password: string;

  @Column({
    type: 'enum',
    enum: UserRoleEnum,
    enumName: USERS_ENTITY_OPTIONS.enumName.role,
  })
  role: UserRoleEnum;

  @Column({type: 'boolean', name: 'is_enable'})
  isEnable: boolean;

  @CreateDateColumn({type: 'timestamp', name: 'insert_date'})
  insertDate!: Date;

  @UpdateDateColumn({type: 'timestamp', name: 'update_date'})
  updateDate!: Date;

  @Exclude()
  @DeleteDateColumn({type: 'timestamp', name: 'delete_date', nullable: true})
  deleteDate!: Date;
}

