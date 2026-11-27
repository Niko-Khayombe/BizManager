import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateBusinessRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(28)
  @IsString({ each: true })
  @Matches(/^[a-z]+\.[a-z]+$/, { each: true })
  permissions: string[];
}
