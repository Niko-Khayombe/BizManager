import { IsOptional, IsString, IsBooleanString } from 'class-validator';

export class GetStockLevelsDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsBooleanString()
  lowStockOnly?: string;
}
