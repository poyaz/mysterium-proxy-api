import {Injectable} from '@nestjs/common';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';

@Injectable()
export class NullUuidIdentifier implements IIdentifier {
  generateId(): string {
    return '00000000-0000-0000-0000-000000000000';
  }
}
