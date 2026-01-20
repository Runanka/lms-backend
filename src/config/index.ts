import 'dotenv/config';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/lms',
  },
  zitadel: {
    issuer: process.env.ZITADEL_ISSUER || '',
    clientId: process.env.ZITADEL_CLIENT_ID || '',
  },
} as const;