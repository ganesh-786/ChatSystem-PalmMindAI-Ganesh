import mongoose from "mongoose";
import { config } from "./config.js";

const mongooseOptions = {
  autoIndex: !config.isProduction,
  maxPoolSize: 20,
  minPoolSize: 2,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

export async function connectDatabase() {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  try {
    const connection = await mongoose.connect(config.mongoUri, mongooseOptions);
    console.log("✔️ Connected to MongoDB");
    return connection;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);

    if (config.mongoUri.startsWith("mongodb+srv://")) {
      console.error(
        "🔎 Atlas SRV lookup failed. Verify DNS resolution and that your network allows outbound DNS/HTTPS traffic to MongoDB Atlas.",
      );
      console.error("   • Run: nslookup cluster0.opgl7zd.mongodb.net");
      console.error(
        "   • Or use a direct mongodb:// URI if SRV is blocked by your network.",
      );
    }

    throw error;
  }
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState === 0) return;

  try {
    await mongoose.disconnect();
    console.log("✔️ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error disconnecting MongoDB:", error);
  }
}
