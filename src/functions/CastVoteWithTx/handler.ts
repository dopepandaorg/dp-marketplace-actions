const fetch = require("node-fetch")

import { formatJSONError, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway'
import { formatJSONResponse } from '@libs/api-gateway'
import { validateTransaction } from '@libs/transaction-validator'
import { middyfy } from '@libs/lambda'
import schema from './schema'
import { walletBalance } from '@libs/wallet-balance'

const DPANDA_ASSET_ID = 391379500
const ONE_MILLION_DPANDA = 1000000 * (1000 * 1000)

/**
 * Hasura option to call and validate the request
 * 
 */
const HASURA_OPERATION = `
mutation CastVote($asset_id: String = "", $contest_id: uuid = "", $tx_id: String = "", $voter: String = "", $weight_dpanda: bigint, $updated_at_round: Int) {
  insert_contest_entries_votes_one(object: {asset_id: $asset_id, contest_id: $contest_id, tx_id: $tx_id, voter: $voter, weight_dpanda: $weight_dpanda, updated_at_round: $updated_at_round}, on_conflict: {constraint: contest_entries_votes_pkey, update_columns: [asset_id, weight_dpanda, updated_at_round]}) {
    asset_id
    contest_id
    tx_id
    voter
    weight_dpanda
    updated_at_round
  }
}
`

/**
 * Execute the parent operation in Hasura
 */
const execute = async (variables) => {
  const fetchResponse = await fetch(
    process.env.HASURA_API,
    {
      method: 'POST',
      body: JSON.stringify({
        query: HASURA_OPERATION,
        variables
      }),
      headers: {
        'x-hasura-admin-secret': process.env.HASURA_SECRET
      }
    }
  )
  const data = await fetchResponse.json()
  console.log('DEBUG: ', data)
  return data
}

const SyncProfileWithTx: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const { wallet, txId, contestId } = event.body
  const { isValid, attributes } = await validateTransaction(txId, wallet, `dp.contest["${contestId}"].vote`)
  const { balance, round } = await walletBalance(wallet, DPANDA_ASSET_ID)

  if (!isValid) {
    console.log('DEBUG: ', 'Transaction not valid', txId)

    return formatJSONError({
      errors: {
        "message": 'Invalid Transaction'
      }
    })
  } else {
    // execute the Hasura operation
    const balanceAdjusted = Math.min(balance, ONE_MILLION_DPANDA)

    const { data, errors } = await execute({ 
      asset_id: String(attributes.asset_id), 
      contest_id: contestId, 
      voter: wallet, 
      tx_id: txId,
      weight_dpanda: balanceAdjusted,
      updated_at_round: round
    })

    // if Hasura operation errors, then throw error
    if (errors) {
      console.log('DEBUG: ', 'Hasura update errors', errors)

      return formatJSONError({
        errors
      })
    }

    return formatJSONResponse({
      ...data.insert_contest_entries_votes_one
    })
  }
}

export const main = middyfy(SyncProfileWithTx)
