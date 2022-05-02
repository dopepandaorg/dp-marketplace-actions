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
 mutation EventInsertParticipateRewards($object: {$amount: "bigint"! = 10, $wallet: "String"!, $type: "String"!}) {
   insert_participation_rewards_one(object: {amount: $amount, wallet: $wallet, type: $type}, on_conflict: { constraint: participation_rewards_pkey, update_columns: type }) {
     amount
     id
     created_at
     type
     is_claimed
     wallet
     updated_at
   }
 }`

const EventInsertParticipateRewards: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const { payload } = event.body

  const { data, errors } = await hasuraExecute(HASURA_OPERATION, { amount: payload.amount, wallet: payload.wallet, type: payload.type })
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