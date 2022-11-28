import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import {Exclude} from 'class-transformer';

const ENTITY_PREFIX = 'account_identity';
export const ACCOUNT_IDENTITY_ENTITY_OPTIONS = {
  tableName: ENTITY_PREFIX,
  primaryKeyName: {
    id: `${ENTITY_PREFIX}_id_pk`,
  },
  uniqueName: {
    identity: `${ENTITY_PREFIX}_username_identity_idx`,
  },
};

@Entity({name: ACCOUNT_IDENTITY_ENTITY_OPTIONS.tableName})
export class AccountIdentityEntity extends BaseEntity {
  @PrimaryColumn({type: 'uuid', primaryKeyConstraintName: ACCOUNT_IDENTITY_ENTITY_OPTIONS.primaryKeyName.id})
  id: string;

  @Column({type: 'varchar', length: 100})
  @Index(ACCOUNT_IDENTITY_ENTITY_OPTIONS.uniqueName.identity, {unique: true, where: 'delete_date ISNULL'})
  identity: string;

  @Column({type: 'varchar', length: 100})
  passphrase: string;

  @Column({type: 'text'})
  path: string;

  @CreateDateColumn({type: 'timestamp', name: 'insert_date'})
  insertDate!: Date;

  @UpdateDateColumn({type: 'timestamp', name: 'update_date'})
  updateDate!: Date;

  @Exclude()
  @DeleteDateColumn({type: 'timestamp', name: 'delete_date'})
  deleteDate!: Date;
}
