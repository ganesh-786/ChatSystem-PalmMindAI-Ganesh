import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { connectDatabase, disconnectDatabase } from './database.js';
import apiRouter from './routes/api.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { globalLimiter, sanitizeInput } from './middleware/security.js';
import { setupSocket } from './socket.js';

const app = express();
const server = createServer(app);

app.set('trust proxy', 1);
app.use(compression());
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS origin denied: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '12kb' }));
app.use(express.urlencoded({ extended: false, limit: '12kb' }));
app.use(cookieParser());
app.use(sanitizeInput);
app.use(globalLimiter);
app.use(morgan(config.isProduction ? 'combined' : 'dev'));

app.use('/api', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

setupSocket(server);

async function startServer() {
  await connectDatabase();

  server.listen(config.port, () => {
    console.log(`🚀 PalmMindAI backend listening on port ${config.port}`);
    console.log(`   environment: ${config.nodeEnv}`);
  });
}

async function shutdown(signal) {
  console.log(`\n🔌 Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer().catch((error) => {
  console.error('❌ Failed to start backend server:', error);
  process.exit(1);
});
