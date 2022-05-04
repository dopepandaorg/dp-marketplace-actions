export default {
  type: "object",
  properties: {
    wallet: { type: 'string' },
    txId: { type: 'string' },
    contestId: { type: 'string' }
  },
  required: ['wallet', 'txId', 'contestId']
} as const;
