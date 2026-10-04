import { IsInt, IsMongoId } from 'class-validator';

export class ToggleFavoriteDto {
  @IsMongoId()
  offerId!: string;

  @IsInt()
  userId!: number; // injecté par le service depuis le payload NATS, pas fourni par le client
}
