export default {
    type: "object",
    properties: {
        payload: {
            type: "object",
            properties: {
                wallet: { type: String },
                amount: { type: String },
                type: { type: String }
            }
        }
    },
    required: ['wallet']
} as const;
