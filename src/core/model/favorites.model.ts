import {ModelRequireProp} from '@src-core/utility';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';

export enum FavoritesListTypeEnum {
  FAVORITE = 'favorite',
  TODAY = 'today',
  OTHER = 'other',
}

export class FavoritesModel {
  id: string;
  kind: FavoritesListTypeEnum;
  usersProxy: Omit<UsersProxyModel, 'clone'>;
  note?: string;
  insertDate: Date;
  updateDate?: Date;

  constructor(props: ModelRequireProp<typeof FavoritesModel.prototype>) {
    Object.assign(this, props);
  }

  clone(): FavoritesModel {
    return Object.assign(Object.create(this), this);
  }
}
