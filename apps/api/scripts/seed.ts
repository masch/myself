import { AppConfig } from "../src/config";
import { seedFromConfig } from "../src/db/seed";

const config = new AppConfig({
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
});
console.log(`Seeding database at ${config.database.url}...`);
await seedFromConfig(config);
console.log("Database seeded successfully!");
