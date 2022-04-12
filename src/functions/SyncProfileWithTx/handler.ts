const fetch = require("node-fetch")

import { formatJSONError, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway'
import { formatJSONResponse } from '@libs/api-gateway'
import { validateTransaction } from '@libs/transaction-validator'
import { middyfy } from '@libs/lambda'
import schema from './schema'

/**
 * Hasura option to call and validate the request
 * 
 */
const HASURA_OPERATION = `
mutation SyncProfileWithTx($wallet: String = "", $display_name: String = "", $bio: String = "") {
  update_profiles_by_pk(pk_columns: {wallet: $wallet}, _set: {display_name: $display_name, bio: $bio}) {
    wallet
    display_name
    handle
    bio
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
  const { wallet, txId } = event.body
  const { isValid, attributes } = await validateTransaction(txId, wallet, 'dp.profile')

  if (!isValid) {
    return formatJSONError({
      errors: 'Invalid Transaction'
    })
  } else {
    // execute the Hasura operation
    const { data, errors } = await execute({ wallet, display_name: attributes.display_name, bio: attributes.bio })

    // if Hasura operation errors, then throw error
    if (errors) {
      return formatJSONError({
        errors
      })
    }

    return formatJSONResponse({
      ...data.update_profiles_by_pk
    })
  }
}

export const main = middyfy(SyncProfileWithTx)
