import {
  BaseEntity,
  Column,
  CreateDateColumn, DeleteDateColumn,
  Entity, Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import {UsersEntity} from '@src-infrastructure/entity/users.entity';
import {Exclude} from 'class-transformer';
import {FavoritesListTypeEnum} from '@src-core/model/favorites.model';

const ENTITY_PREFIX = 'favorites';
export const FAVORITES_ENTITY_OPTIONS = {
  tableName: ENTITY_PREFIX,
  primaryKeyName: {
    id: `${ENTITY_PREFIX}_id_pk`,
  },
  uniqueName: {
    providerIdentity: `${ENTITY_PREFIX}_provider_identity_unique_idx`,
  },
  foreignKeyName: {
    usersId: `${ENTITY_PREFIX}_user_id_fk`,
  },
};

@Entity({name: FAVORITES_ENTITY_OPTIONS.tableName})
export class FavoritesEntity extends BaseEntity {
  @PrimaryColumn({type: 'uuid', primaryKeyConstraintName: FAVORITES_ENTITY_OPTIONS.primaryKeyName.id})
  id: string;

  @ManyToOne(() => UsersEntity)
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: FAVORITES_ENTITY_OPTIONS.foreignKeyName.usersId,
  })
  user: UsersEntity;

  @Column({type: 'enum', enum: FavoritesListTypeEnum})
  kind: FavoritesListTypeEnum;

  @Column({type: 'uuid', name: 'provider_id'})
  providerId: string;

  @Column({type: 'varchar', length: 225, name: 'provider_identity'})
  @Index(FAVORITES_ENTITY_OPTIONS.uniqueName.providerIdentity, {unique: true, where: 'delete_date ISNULL'})
  providerIdentity: string;

  @Column({type: 'varchar', length: 100, name: 'last_outgoing_ip', nullable: true})
  lastOutgoingIp?: string;

  @Column({type: 'text', nullable: true})
  note?: string;

  @CreateDateColumn({type: 'timestamp', name: 'insert_date'})
  insertDate!: Date;

  @UpdateDateColumn({type: 'timestamp', name: 'update_date'})
  updateDate!: Date;

  @Exclude()
  @DeleteDateColumn({type: 'timestamp', name: 'delete_date', nullable: true})
  deleteDate!: Date;
}
