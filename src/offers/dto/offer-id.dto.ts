// offers/dto/offer-id.dto.ts
import { IsMongoId } from 'class-validator';

export class OfferIdDto {
  @IsMongoId()
  id!: string;
}
