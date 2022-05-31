import { formatJSONError, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway'
import { formatJSONResponse } from '@libs/api-gateway'
import { middyfy } from '@libs/lambda'
import schema from './schema'
import { hasuraExecute } from '@libs/hasura-client'

/**
 * Hasura option to call and validate the request
 * 
 */
const HASURA_OPERATION = `
 mutation EventInsertParticipateRewards($amount: bigint!, $type: String!, $wallet: String!) {
  insert_participation_rewards_one(object: {amount: $amount, type: $type, wallet: $wallet }, on_conflict: {constraint: participation_rewards_pkey, update_columns: [amount]}) {
    amount
    id
    type
    wallet
    updated_at
    is_claimed
    created_at
  }
 }`


const EventInsertParticipateRewards: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const payload = event.body

  const { data, errors } = await hasuraExecute(HASURA_OPERATION, { amount: payload?.amount, type: payload?.type, wallet: payload.wallet})

  // if Hasura operation errors, then throw error
  if (errors) {
    return formatJSONError({
      errors
    })
  }

  return formatJSONResponse({
    ...data
  })
}

export const main = middyfy(EventInsertParticipateRewards)