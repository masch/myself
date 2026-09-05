import { AppConfig } from "../src/config";
import { seedFromConfig } from "../src/db/seed";

const config = AppConfig.from();
console.log(`Seeding database at ${config.database.url}...`);
await seedFromConfig(config);
console.log("Database seeded successfully!");
