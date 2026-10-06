import {
  connectDatabase,
  disconnectDatabase,
} from "../config/database.config.js";
import { seedDatabase } from "../services/seed.service.js";

try {
  await connectDatabase();
  const summary = await seedDatabase();
  console.warn(
    `Seed complete: ${summary.resourcesUpserted} resources written, ${summary.reservationsDeleted} reservations cleared.`,
  );
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
