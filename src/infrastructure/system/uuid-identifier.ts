import {Injectable} from '@nestjs/common';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import * as uuid from 'uuid';

@Injectable()
export class UuidIdentifier implements IIdentifier {
  private readonly _nameSpaceUuid: string = '4e792c4b-0ad6-4d54-aee2-e43cb1870c33';

  constructor(nameSpaceUuid?: string) {
    if (nameSpaceUuid) {
      this._nameSpaceUuid = nameSpaceUuid;
    }
  }

  generateId(): string;
  generateId(data: string): string;
  generateId(data?: string): string {
    if (!data) {
      return uuid.v4();
    }

    return uuid.v5(data, this._nameSpaceUuid);
  }
}
