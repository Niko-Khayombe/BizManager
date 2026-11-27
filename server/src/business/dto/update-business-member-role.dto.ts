import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateBusinessMemberRoleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  roleId: string;
}
