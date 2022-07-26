import {ModelRequireProp} from '@src-core/utility';

export class MystIdentityModel {
  id: string;
  identity: string;
  passphrase: string;
  path: string;
  isUse: boolean;
  insertDate: Date;
  updateDate?: Date;

  constructor(props: ModelRequireProp<typeof MystIdentityModel.prototype>) {
    Object.assign(this, props);
  }
}
