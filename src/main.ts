import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.NATS,
    options: {
      servers: ['nats://localhost:4222'],
    },
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  //pas de précision de port pour le microservice NATS, car il utilise le port par défaut de NATS (4222)
  await app.listen();
}
bootstrap();
