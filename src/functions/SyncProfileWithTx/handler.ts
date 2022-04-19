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
const HASURA_OPERATION = `
mutation SyncProfileWithTx($wallet: String!, $avatar_cid: String, $banner_cid: String, $bio: String = "", $display_name: String = "", $handle: String = "", $social_instagram: String = "", $social_twitter: String = "", $social_website: String = "") {
  update_profiles_by_pk(pk_columns: {wallet: $wallet}, _set: {avatar_cid: $avatar_cid, banner_cid: $banner_cid, bio: $bio, display_name: $display_name, handle: $handle, social_instagram: $social_instagram, social_twitter: $social_twitter, social_website: $social_website}) {
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

  if (!isValid) {
    return formatJSONError({
      errors: 'Invalid Transaction'
    })
  } else {
    const { data, errors } = await hasuraExecute(HASURA_OPERATION, { wallet, avatar_cid: attributes.avatar_cid, banner_cid: attributes.banner_cid, bio: attributes.bio, display_name: attributes.display_name, handle: attributes.handle, social_instagram: attributes.social_instagram, social_twitter: attributes.social_twitter, social_website: attributes.social_website })
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
