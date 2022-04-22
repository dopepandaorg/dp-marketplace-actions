export default {
  type: "object",
  properties: {
    wallet: { type: 'string' },
    txId: { type: 'string' }
  },
  required: ['wallet', 'txId']
} as const;
