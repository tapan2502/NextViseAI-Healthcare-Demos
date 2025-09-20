#!/usr/bin/env tsx

import { seedPharmacyData } from "../seeds/pharmacy-data";

async function runSeeding() {
  try {
    console.log("🚀 Starting database seeding...");
    await seedPharmacyData();
    console.log("✅ Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    process.exit(1);
  }
}

runSeeding();