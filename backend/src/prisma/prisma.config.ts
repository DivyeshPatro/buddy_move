import { defineConfig } from '@prisma/client/runtime';

export default defineConfig({
  datasource: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
