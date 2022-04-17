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
mutation ConnectProfile($wallet: String) {
  insert_profiles_one(object: {wallet: $wallet}, on_conflict: {constraint: profiles_pkey, update_columns: wallet}) {
    wallet
  }
}
`

const ConnectProfile: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const { wallet } = event.body
  const { data, errors } = await hasuraExecute(HASURA_OPERATION, { wallet })

  // if Hasura operation errors, then throw error
  if (errors) {
    console.log('DEBUG: ', 'Hasura update errors', errors)

    return formatJSONError({
      errors
    })
  }

  return formatJSONResponse({
    ...data.insert_profiles_one
  })
}

export const main = middyfy(ConnectProfile)
