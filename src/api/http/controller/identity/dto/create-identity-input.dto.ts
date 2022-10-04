import {ApiProperty} from '@nestjs/swagger';
import {IsDefined, IsString, MaxLength, MinLength} from 'class-validator';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {instanceToPlain, plainToInstance} from 'class-transformer';
import {defaultModelFactory} from '@src-core/model/defaultModel';

export class CreateIdentityInputDto {
  @ApiProperty({
    description: 'The passphrase of identity for login and use on proxy',
    type: String,
    minLength: 1,
    maxLength: 100,
    required: true,
    example: 'my identity password',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsDefined()
  passphrase: string;

  static toModel(dto: CreateIdentityInputDto, file: Express.Multer.File): MystIdentityModel {
    return defaultModelFactory(
      MystIdentityModel,
      {
        id: 'default-id',
        identity: 'default-identity',
        passphrase: dto.passphrase,
        path: file.destination,
        filename: file.filename,
        isUse: false,
        insertDate: new Date(),
      },
      ['id', 'identity', 'isUse', 'insertDate'],
    );
  }
}
