import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the specific server .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const requiredEnv = ['MONGO_URI', 'JWT_SECRET'] as const;

for (const env of requiredEnv) {
  if (!process.env[env]) {
    throw new Error(`❌ Missing critical environment variable: ${env}`);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI as string,
  jwtSecret: process.env.JWT_SECRET as string,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3100',
};