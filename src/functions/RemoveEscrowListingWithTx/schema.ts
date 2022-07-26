export default {
  type: "object",
  properties: {
    id: { type: 'string' },
    assetId: { type: 'number' },
    appId: { type: 'number' },
    wallet: { type: 'string' },
    txId: { type: 'string' }
  },
  required: ['wallet', 'txId', 'id', 'appId', 'assetId']
} as const;
