import {FavoritesListTypeEnum} from '@src-core/model/favorites.model';
import {IsDefined, IsEnum, IsOptional, IsString, IsUUID, MaxLength} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';
import {Exclude} from 'class-transformer';

export class CreateUsersFavoritesInputDto {
  @ApiProperty({
    title: 'The kind of favorite list',
    description: [
      'This flag show kind of favorite list. All kind of favorite describe bellow:',
      `* Show **favorite** list: \`${FavoritesListTypeEnum.FAVORITE}\``,
      `* Show **today** list: \`${FavoritesListTypeEnum.TODAY}\``,
    ].join('\n'),
    type: String,
    enum: {
      [FavoritesListTypeEnum.FAVORITE]: FavoritesListTypeEnum.FAVORITE,
      [FavoritesListTypeEnum.TODAY]: FavoritesListTypeEnum.TODAY,
    },
    required: true,
    example: FavoritesListTypeEnum.FAVORITE,
  })
  @IsEnum({
    [FavoritesListTypeEnum.FAVORITE]: FavoritesListTypeEnum.FAVORITE,
    [FavoritesListTypeEnum.TODAY]: FavoritesListTypeEnum.TODAY,
  })
  @IsDefined()
  kind: Exclude<FavoritesListTypeEnum, FavoritesListTypeEnum.OTHER>;

  @ApiProperty({
    description: 'The identity of proxy',
    type: String,
    format: 'uuid',
    required: true,
    example: '00000000-0000-0000-0000-000000000000',
  })
  @IsDefined()
  @IsUUID()
  proxyId: string;

  @ApiProperty({
    description: 'The note about proxy',
    type: String,
    maxLength: 1000,
    required: false,
    nullable: true,
    example: 'Information about proxy X',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
