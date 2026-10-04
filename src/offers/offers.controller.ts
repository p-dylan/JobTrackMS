import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { FindAllOffersDto } from './dto/find-all-offers.dto';
import { OfferIdDto } from './dto/offer-id.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { ToggleFavoriteDto } from './dto/toggle-favorite.dto';

@Controller()
export class OffersController {
  constructor(private offersService: OffersService) {}

  @MessagePattern('offers.get')
  findAll(@Payload() payload: FindAllOffersDto & { user_id: number }) {
    console.log('Received payload for findAll:', payload);
    return this.offersService.findAll(payload);
  }

  @MessagePattern('offers.findOne')
  findOne(@Payload() payload: OfferIdDto) {
    return this.offersService.findOne(payload.id);
  }

  @MessagePattern('offers.create')
  create(@Payload() dto: CreateOfferDto) {
    return this.offersService.create(dto);
  }

  @MessagePattern('offers.update')
  update(
    @Payload()
    payload: {
      id: string;
      data: UpdateOfferDto;
      requestingCompanyId: number;
    },
  ) {
    return this.offersService.update(
      payload.id,
      payload.data,
      payload.requestingCompanyId,
    );
  }

  @MessagePattern('offers.remove')
  remove(@Payload() payload: { id: string; requestingCompanyId: number }) {
    return this.offersService.remove(payload.id, payload.requestingCompanyId);
  }

  @MessagePattern('offers.restore')
  restore(@Payload() payload: { id: string; requestingCompanyId: number }) {
    return this.offersService.restore(payload.id, payload.requestingCompanyId);
  }

  @MessagePattern('offers.favorite.add')
  addFavorite(@Payload() payload: ToggleFavoriteDto) {
    return this.offersService.addFavorite(payload.userId, payload.offerId);
  }

  @MessagePattern('offers.favorite.remove')
  removeFavorite(@Payload() payload: ToggleFavoriteDto) {
    return this.offersService.removeFavorite(payload.userId, payload.offerId);
  }

  @EventPattern('company.removed')
  async handleCompanyRemoved(@Payload() payload: { companyId: number }) {
    await this.offersService.removeAllByCompany(payload.companyId);
  }

  // Appel du service NATS pour récupérer les offres d'emploi
  //ODM = Object Document Mapper, c'est un outil qui permet de mapper les objets d'une application à des documents dans une base de données NoSQL.
  // Il facilite la manipulation des données en offrant une interface orientée objet pour interagir avec la base de données. (exemple : Mongoose pour MongoDB)
}
