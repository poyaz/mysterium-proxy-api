import {ModelRequireProp} from '../utility';
import {UserRoleEnum} from '../enum/user-role.enum';

export class UsersModel {
  id: string;
  username: string;
  password: string;
  role?: UserRoleEnum = UserRoleEnum.USER;
  isEnable?: boolean = true;
  insertDate: Date;
  updateDate?: Date;

  constructor(props: ModelRequireProp<typeof UsersModel.prototype>) {
    Object.assign(this, props);
  }
}
