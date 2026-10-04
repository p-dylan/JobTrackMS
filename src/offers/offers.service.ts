import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Offer, OfferDocument } from './schema/offers.schema';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { FindAllOffersDto } from './dto/find-all-offers.dto';
import { QueryFilter } from 'mongoose';
import { Favorite, FavoriteDocument } from './schema/favorite.schema';

@Injectable()
export class OffersService {
  constructor(
    //communication avec MongoDB pour les offres et favoris
    @InjectModel(Offer.name) private offerModel: Model<OfferDocument>,
    @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>,
    //envoie d'event via NATS
    @Inject('NATS_CLIENT') private natsClient: ClientProxy,
  ) {}

  async addFavorite(userId: number, offerId: string) {
    await this.findOne(offerId); //vérifie que l'offre existe et n'est pas supprimé
    try {
      return await this.favoriteModel.create({ userId, offerId });
    } catch (err) {
      const mongoError = err as { code?: number };
      //11000 code violation index unique
      if (mongoError.code === 11000)
        throw new RpcException('Offer already in favorites'); // doublon détecter par index unique
      //si erreur différentes
      throw err;
    }
  }

  async removeFavorite(userId: number, offerId: string) {
    //recherche puis supprime le favori correspondant
    const result = await this.favoriteModel.findOneAndDelete({
      userId,
      offerId,
    });
    if (!result) throw new RpcException('Favorite not found');
    return result;
  }

  async findAll(params: FindAllOffersDto & { user_id: number }) {
    const {
      //nombre d'offres a ignorer avant récupération
      skip = 0,
      //Nombre d'offres a récupérer
      take = 10,
      //texte rechercher par user
      search,
      //filtre type de contrat
      contractType,
      //filtre sur entreprise
      companyId,
      //ordre tri
      sort = 'desc',
      //filtre secteur d'activité
      category,
      //filtre mode de travail (sur site / distance / hybride)
      workMode,
      //filtre temps partiel
      partTime,
      //récupère offre en favori
      favoritesOnly,
      //user connecter
      user_id,
    } = params;

    //récupère offres non supprimées
    const filter: QueryFilter<OfferDocument> = { deletedAt: null };
    //si type de contrat fourni on ajoute ce filtre
    if (contractType) filter.contractType = contractType;
    //si identifiant entreprise fourni on ajoute ce filtre
    if (companyId) filter.companyId = companyId;
    if (category) filter.category = category;
    if (workMode) filter.workMode = workMode;
    if (partTime) filter.partTime = true;
    //si recherche, recherche le texte par rapport au titre, description ou lieu
    if (search)
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    console.log('Filtre Mongo des offres:', JSON.stringify(filter));
    if (favoritesOnly) {
      //récupère favoris du user
      const favorites = await this.favoriteModel
        .find({ userId: user_id })
        //récupere uniquement offerId
        .select('offerId');
      //modif filtre, récupe que offre présente dans favori
      filter._id = { $in: favorites.map((f) => f.offerId) };
    }

    //requête Mongo
    const [data, total] = await Promise.all([
      //1récupérer les offres === au filtre
      this.offerModel
        .find(filter)
        .skip(skip)
        .limit(take)
        //1=croissant, -1 = décroissant
        .sort({ createdAt: sort === 'asc' ? 1 : -1 }),
      //2compte le nombre total offres
      this.offerModel.countDocuments(filter),
    ]);
    //return offres plus info pagination
    return { data, total, skip, take };
  }

  async findOne(id: string) {
    const offer = await this.offerModel.findOne({ _id: id, deletedAt: null });
    if (!offer) throw new RpcException(`Offer with id ${id} not found`);
    return offer;
  }

  async create(dto: CreateOfferDto) {
    try {
      const newOffer = new this.offerModel(dto);
      return await newOffer.save();
    } catch (err) {
      console.error('Erreur création offre:', err); // ← pour voir la vraie cause dans le terminal ms
      throw new RpcException(
        err instanceof Error ? err.message : 'Failed to create offer',
      );
    }
  }

  async update(id: string, dto: UpdateOfferDto, requestingCompanyId: number) {
    const offer = await this.findOne(id); // Ensure the offer exists
    if (offer.companyId !== requestingCompanyId) {
      throw new RpcException(`Vous n'êtes pas autorisé à modifier cette offre`);
    }
    return this.offerModel.findByIdAndUpdate(id, dto, {
      returnDocument: 'after', //return le document après update plutot qu'avant ({ new: true } => { returnDocument: 'after' })
    });
  }

  //supprime une offre sans la supprimer réellement de MongoDB (soft delete) suppression logique
  private async softDeleteOffer(offer: OfferDocument) {
    const updated = await this.offerModel.findByIdAndUpdate(
      offer.id,
      { deletedAt: new Date() },
      { returnDocument: 'after' },
    );
    //informe a nats que l'offre est supprimée
    this.natsClient.emit('offer.removed', { offerId: offer.id });
    return updated;
  }

  async remove(id: string, requestingCompanyId: number) {
    const offer = await this.findOne(id); // Ensure the offer exists
    //vérif entreprise bien propriétaire de l'offre
    if (offer.companyId !== requestingCompanyId) {
      throw new RpcException(
        `Vous n'êtes pas autorisé à supprimer cette offre`,
      );
    }
    return this.softDeleteOffer(offer);
  }

  async removeAllByCompany(companyId: number) {
    const offers = await this.offerModel.find({ companyId, deletedAt: null });
    //suppression logique des offres en parallèle
    await Promise.all(offers.map((offer) => this.softDeleteOffer(offer)));
  }

  async restore(id: string, requestingCompanyId: number) {
    const offer = await this.offerModel.findById(id);
    if (!offer || !offer.deletedAt)
      throw new RpcException(`No deleted offer ${id} to restore`);
    if (offer.companyId !== requestingCompanyId) {
      throw new RpcException(
        `Vous n'êtes pas autorisé à restaurer cette offre`,
      );
    }
    return this.offerModel.findByIdAndUpdate(
      id,
      { deletedAt: null },
      { returnDocument: 'after' },
    );
  }
}
