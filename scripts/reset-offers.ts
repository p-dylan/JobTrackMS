// Vide les offres et les favoris dans Mongo (DEV uniquement), à lancer avant le seed du back
import 'dotenv/config';
import mongoose from 'mongoose';

async function resetOffers() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[reset-offers] interdit en production');
  }
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('[reset-offers] MONGO_URI manquant dans .env');

  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  for (const name of ['offers', 'favorites']) {
    const { deletedCount } = await db.collection(name).deleteMany({});
    console.log(
      `[reset-offers] ${name} : ${deletedCount} document(s) supprimé(s)`,
    );
  }
  await mongoose.disconnect();
}

resetOffers().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
