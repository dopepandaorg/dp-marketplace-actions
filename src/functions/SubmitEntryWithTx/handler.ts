const fetch = require("node-fetch")

import { formatJSONError, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway'
import { formatJSONResponse } from '@libs/api-gateway'
import { validateTransaction } from '@libs/transaction-validator'
import { middyfy } from '@libs/lambda'
import schema from './schema'
import { walletBalance } from '@libs/wallet-balance'

const DPANDA_ASSET_ID = process.env.NETWORK_ENV === 'mainnet' ? 391379500 : 85326355
const ONE_THOUSAND_DPANDA = 1000 * (1000 * 1000)

/**
 * Hasura option to call and validate the request
 * 
 */
const HASURA_OPERATION = `
mutation SubmitEntry($asset_id: String!, $contest_id: uuid!, $created_tx_id: String!, $created_at_round: bigint, $creator: String!, $reward_wallet: String = "") {
  insert_contest_entries_one(object: {asset_id: $asset_id, contest_id: $contest_id, created_tx_id: $created_tx_id, created_at_round: $created_at_round, creator: $creator, reward_wallet: $reward_wallet}) {
    id
    asset_id
    contest_id
    created_tx_id
    created_at_round
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
  const { isValid, attributes } = await validateTransaction(txId, wallet, `dp.contest["${contestId}"].submitEntry`)
  const { balance, round } = await walletBalance(wallet, DPANDA_ASSET_ID)

  if (!isValid) {
    console.log('DEBUG: ', 'Transaction not valid', txId)

    return formatJSONError({
      errors: {
        "message": 'Invalid Transaction'
      }
    })
  } else if (balance < ONE_THOUSAND_DPANDA) {
    console.log('DEBUG: ', 'Does not meet minimum balance', txId)

    return formatJSONError({
      errors: {
        "message": 'Does not meet minimum balance'
      }
    })
  } else {
    // execute the Hasura operation
    const { data, errors } = await execute({ 
      asset_id: String(attributes.asset_id),
      contest_id: contestId, 
      creator: wallet,
      reward_wallet: String(attributes.reward_wallet),
      created_tx_id: txId,
      created_at_round: round
    })

    // if Hasura operation errors, then throw error
    if (errors) {
      console.log('DEBUG: ', 'Hasura update errors', errors)

      return formatJSONError({
        errors
      })
    }

    return formatJSONResponse({
      ...data.insert_contest_entries_one
    })
  }
}

export const main = middyfy(SyncProfileWithTx)
