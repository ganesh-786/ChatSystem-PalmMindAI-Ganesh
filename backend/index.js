import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { connectDatabase } from "./database.js";
import apiRouter from "./routes/api.js";
import { notFoundHandler, errorHandler } from "./middleware/error.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan(config.isProduction ? "combined" : "dev"));

app.use("/api", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  await connectDatabase();

  app.listen(config.port, () => {
    console.log(`🚀 PalmMindAI backend listening on port ${config.port}`);
    console.log(`   environment: ${config.nodeEnv}`);
  });
}

function shutdown(signal) {
  console.log(`\n🔌 Received ${signal}. Shutting down gracefully...`);
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer().catch((error) => {
  console.error("❌ Failed to start backend server:", error);
  process.exit(1);
});
