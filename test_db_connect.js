import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => {
    console.log('✅ Connected to database');
    return client.end();
  })
  .catch((err) => {
    console.error('❌ Connection error:', err.message);
  });
