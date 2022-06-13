import {SetMetadata} from '@nestjs/common';

export const ExcludeAuth = () => SetMetadata('disableCheckAuth', true);
