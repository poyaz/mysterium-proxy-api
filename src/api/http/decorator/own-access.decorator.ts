import {SetMetadata} from '@nestjs/common';

export const OwnAccess = () => SetMetadata('ownAccess', true);
export const OwnModification = () => SetMetadata('ownModification', true);
