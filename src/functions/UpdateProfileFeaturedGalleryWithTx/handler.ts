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
mutation UpdateProfileFeaturedGalleryWithTx($wallet: String!, $featured_gallery: jsonb!) {
  update_profiles_by_pk(pk_columns: {wallet: $wallet}, _set: {featured_gallery: $featured_gallery}) {
    featured_gallery
    wallet
  }
}`

const UpdateProfileFeaturedGalleryWithTx: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const { wallet, txId } = event.body
  const { isValid, attributes: featuredGallery } = await validateTransaction(txId, wallet, 'dp.profileShowcase')

  if (!isValid) {

    return formatJSONError({
      errors: 'Invalid Transaction'
    })
  } else if (featuredGallery.length !== 8) {
    return formatJSONError({
      errors: 'Featured Gallery Array does not contain enough elements'
    })
  } else {
    const pattern = /^[0-9]{8,10}$/
    const assetIds = featuredGallery.filter(f => f !== null)

    const isValidAssetId = assetIds.map(a => pattern.test(a))

    if (isValidAssetId.includes(false)) {
      return formatJSONError({
        errors: 'Featured Gallery Array does not contain valid asset Id'
      })
    }
    const { data, errors } = await hasuraExecute(HASURA_OPERATION, { wallet, featured_gallery: featuredGallery })

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

export const main = middyfy(UpdateProfileFeaturedGalleryWithTx)