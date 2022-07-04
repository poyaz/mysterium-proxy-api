import {ModelRequireProp} from '@src-core/utility';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';

export class UsersModel {
  id: string;
  username: string;
  password: string;
  role?: UserRoleEnum;
  isEnable?: boolean;
  insertDate: Date;
  updateDate?: Date;

  constructor(props: ModelRequireProp<typeof UsersModel.prototype>) {
    Object.assign(this, props);
  }

  clone() {
    return Object.assign(Object.create(this), this);
  }
}
