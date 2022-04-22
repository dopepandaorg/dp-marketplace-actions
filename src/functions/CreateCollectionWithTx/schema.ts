export default {
  type: "object",
  properties: {
    wallet: { type: 'string' },
    txId: { type: 'string' },
    title: { type: 'string' },
    creator: { type: 'string' },
  },
  required: ['wallet', 'txId', 'title', 'creator']
} as const;
