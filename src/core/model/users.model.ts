import {ModelRequireProp} from '../utility';
import {UserRoleEnum} from '../enum/user-role.enum';

export class UsersModel {
  id: string;
  username: string;
  password: string;
  role: UserRoleEnum;
  isEnable: boolean;
  insertDate: Date;

  constructor(props: ModelRequireProp<typeof UsersModel.prototype>) {
    Object.assign(this, props);
  }
}
