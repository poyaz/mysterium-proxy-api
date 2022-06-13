export class UsersModel {
  id: string;
  username: string;
  password: string;
  role: string;
  isEnable: boolean;
  insertDate: Date;
  updateDate: Date | null;
}
