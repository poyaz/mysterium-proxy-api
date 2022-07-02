import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import {UserRoleEnum} from '../../core/enum/user-role.enum';
import {Exclude} from 'class-transformer';

@Entity({name: 'users'})
export class UsersEntity extends BaseEntity {
  @PrimaryColumn({type: 'uuid'})
  id: string;

  @Column({type: 'varchar', length: 100})
  username: string;

  @Column({type: 'varchar', length: 225})
  password: string;

  @Column({type: 'enum', enum: UserRoleEnum})
  role: UserRoleEnum;

  @Column({type: 'boolean', name: 'is_enable'})
  isEnable: boolean;

  @CreateDateColumn({type: 'timestamp', name: 'insert_date'})
  insertDate!: Date;

  @UpdateDateColumn({type: 'timestamp', name: 'update_date'})
  updateDate!: Date;

  @Exclude()
  @DeleteDateColumn({type: 'timestamp', name: 'delete_date'})
  deleteDate!: Date;
}

