export default {
  type: "object",
  properties: {
    id: { type: 'string' },
    wallet: { type: 'string' },
    txId: { type: 'string' }
  },
  required: ['id', 'wallet', 'txId']
} as const;
