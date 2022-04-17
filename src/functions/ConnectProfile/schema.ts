export default {
  type: "object",
  properties: {
    wallet: { type: 'string' }
  },
  required: ['wallet']
} as const;
