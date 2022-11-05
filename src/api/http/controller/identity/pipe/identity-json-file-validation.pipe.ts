import {ArgumentMetadata, HttpStatus, Injectable, PipeTransform, UnprocessableEntityException} from '@nestjs/common';

@Injectable()
export class IdentityJsonFileValidationPipe implements PipeTransform<Express.Multer.File> {
  transform(value: Express.Multer.File, metadata: ArgumentMetadata) {
    const twoKb = 2000;

    if (!value) {
      throw new UnprocessableEntityException({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: [`Identity file not found`],
        error: 'Unprocessable Entity',
      });
    }

    if (value.size > twoKb) {
      throw new UnprocessableEntityException({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: [`Identity file too large, you can upload files up to ${twoKb} KB`],
        error: 'Unprocessable Entity',
      });
    }

    if (!/.+\.json$/.exec(value.originalname)) {
      throw new UnprocessableEntityException({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: ['Identity file must be JSON type'],
        error: 'Unprocessable Entity',
      });
    }

    return value;
  }
}
