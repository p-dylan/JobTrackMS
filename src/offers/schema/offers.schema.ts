// offers/schemas/offer.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OfferDocument = HydratedDocument<Offer>;

export enum ContractType {
  CDI = 'CDI',
  CDD = 'CDD',
  FREELANCE = 'FREELANCE',
  STAGE = 'STAGE',
}

export enum WorkMode {
  ON_SITE = 'ON_SITE',
  REMOTE = 'REMOTE',
  HYBRID = 'HYBRID',
}

//secteur d'activité de l'offre (badges catégories du front)
export enum OfferCategory {
  INFORMATIQUE = 'INFORMATIQUE',
  ENSEIGNEMENT = 'ENSEIGNEMENT',
  HOTELLERIE = 'HOTELLERIE',
  ADMINISTRATION = 'ADMINISTRATION',
  COMMERCE = 'COMMERCE',
  TRANSPORT = 'TRANSPORT',
  SANTE = 'SANTE',
  INDUSTRIE = 'INDUSTRIE',
  MARKETING = 'MARKETING',
  FINANCE = 'FINANCE',
}

@Schema({ timestamps: true }) // gère createdAt/updatedAt automatiquement
export class Offer {
  @Prop({ required: true })
  companyId!: number;

  @Prop({ required: true })
  createdByUserId!: number;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true, enum: ContractType })
  contractType!: ContractType;

  //champs avec valeur par défaut : les offres déjà en base restent valides
  @Prop({ enum: WorkMode, default: WorkMode.ON_SITE })
  workMode!: WorkMode;

  @Prop({ default: false })
  partTime!: boolean;

  @Prop({ type: String, enum: OfferCategory, default: null })
  category!: OfferCategory | null;

  @Prop({ type: String, default: null })
  location!: string | null;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;
}

export const OfferSchema = SchemaFactory.createForClass(Offer);
OfferSchema.index({ deletedAt: 1 });
OfferSchema.index({ contractType: 1 });
OfferSchema.index({ companyId: 1 });
OfferSchema.index({ category: 1 });
OfferSchema.index({ workMode: 1 });
