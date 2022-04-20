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


  let updateAttributsOfProfile = { avatar_cid: attributes?.avatar_cid, banner_cid: attributes?.banner_cid, bio: attributes?.bio, display_name: attributes?.display_name, social_instagram: attributes?.social_instagram, social_twitter: attributes?.social_twitter, social_website: attributes?.social_website } as any

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

        return formatJSONError({
          errors: {
            "message": 'Invalid Transaction'
          }
        })
      } else if (handleAlreadyExist.length === 0) {
        console.log('DEBUG: ', 'Handle name not already exist', handleAlreadyExist)
        updateAttributsOfProfile.handle = attributes?.handle
      }
    }

    const { data, errors } = await hasuraExecute(HASURA_OPERATION, { wallet, object: updateAttributsOfProfile })

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
