import {Injectable} from '@nestjs/common';
import {IIdentifier} from '../../core/interface/i-identifier.interface';
import * as uuid from 'uuid';

@Injectable()
export class UuidIdentifier implements IIdentifier {
  generateId(): string {
    return uuid.v4();
  }
}
