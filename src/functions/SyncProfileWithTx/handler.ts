import { formatJSONError, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway'
import { formatJSONResponse } from '@libs/api-gateway'
import { validateTransaction } from '@libs/transaction-validator'
import { middyfy } from '@libs/lambda'
import schema from './schema'
import { hasuraExecute } from '@libs/hasura-client'

/**
 * Hasura option to call and validate the request
 * 
 */

const HASURA_VALIDATE_OPERATION = `
 query ValidateAlreadyHandleProfile($wallet: String!, $handle: String!) {
  profiles_aggregate(where: {wallet: {_neq: $wallet}, handle: {_eq: $handle}}) {
    nodes {
      handle
      wallet
    }
  }
}`




const HASURA_OPERATION = `
mutation SyncProfileWithTx($wallet: String!, $object: profiles_set_input) {
  update_profiles_by_pk(pk_columns: {wallet: $wallet}, _set: $object) {
    display_name
    bio
    handle
    social_twitter
    social_instagram
    social_website
    banner_cid
    avatar_cid
    wallet
  }
}`


const SyncProfileWithTx: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const { wallet, txId } = event.body
  const { isValid, attributes } = await validateTransaction(txId, wallet, 'dp.profile')

  const updateAttributs = {} as any

  Object.keys(attributes).map(keys => {
    updateAttributs[keys] = attributes[keys]
  })
  if (!isValid) {

    return formatJSONError({
      errors: 'Invalid Transaction'
    })
  } else {
    if (attributes?.handle) {
      const { data, error } = await hasuraExecute(HASURA_VALIDATE_OPERATION, { wallet, handle: attributes.handle })
      const handleAlreadyExist = data.profiles_aggregate.nodes
      if (error) {
        console.log('DEBUG: ', 'Error in Handle name already exist', error)
      
      } else if (handleAlreadyExist.length > 0) {
        console.log('DEBUG: ', 'Handle name already exist', handleAlreadyExist)
        delete updateAttributs.handle
      }
    }
    const { data, errors } = await hasuraExecute(HASURA_OPERATION, { wallet, object: updateAttributs })

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
