import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ContractType, OfferCategory, WorkMode } from '../schema/offers.schema';

export class CreateOfferDto {
  @IsInt()
  companyId!: number;

  @IsInt()
  createdByUserId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(ContractType)
  contractType!: ContractType;

  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @IsOptional()
  @IsBoolean()
  partTime?: boolean;

  @IsOptional()
  @IsEnum(OfferCategory)
  category?: OfferCategory;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;
}
