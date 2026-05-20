import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const requiredEnv = ['MONGO_URI', 'CLIENT_URL'];
const missing = requiredEnv.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
}

const port = Number(process.env.PORT || 5000);
if (Number.isNaN(port) || port <= 0) {
  throw new Error('Invalid PORT value in environment configuration');
}

export const config = {
  port,
  nodeEnv: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL,
  isProduction: process.env.NODE_ENV === 'production',
};
