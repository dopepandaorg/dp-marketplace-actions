export default {
  type: "object",
  properties: {
    payload: {
      type: "object",
      properties: {
        contestId: { type: String }
      }
    }
  }
} as const;
