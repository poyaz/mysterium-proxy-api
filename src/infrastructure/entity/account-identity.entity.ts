import {BaseEntity, Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryColumn, UpdateDateColumn} from 'typeorm';
import {Exclude} from 'class-transformer';

@Entity({name: 'account_identity'})
export class AccountIdentityEntity extends BaseEntity {
  @PrimaryColumn({type: 'uuid'})
  id: string;

  @Column({type: 'varchar', length: 100})
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
