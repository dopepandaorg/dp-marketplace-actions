import schema from './schema';
import { handlerPath } from '@libs/handler-resolver';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  timeout: 30,
  memorySize: 128,
  events: [
    {
      http: {
        method: 'post',
        path: 'UpdateFeaturedGalleryWithTx',
        request: {
          schemas: {
            'application/json': schema,
          },
        },
      },
    },
  ],
  environment: {
    HASURA_API: process.env.HASURA_API,
    HASURA_SECRET: process.env.HASURA_SECRET,
    PURESTAKE_API_KEY: process.env.PURESTAKE_API_KEY,
    NETWORK_ENV: process.env.NETWORK_ENV
  }
};
