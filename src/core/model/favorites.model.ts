import {UsersModel} from '@src-core/model/users.model';

export enum FavoritesListTypeEnum {
  FAVORITE = 'favorite',
  TODAY = 'today',
}

export class FavoritesModel {
  id: string;
  listType: FavoritesListTypeEnum;
  user: Omit<UsersModel, 'clone'>;
  providerId: string;
  providerIdentity: string;
  lastOutgoingIp?: string;
  note?: string;
  insertDate: Date;
  updateDate?: Date;
}
