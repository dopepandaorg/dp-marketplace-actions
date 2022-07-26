import { formatJSONError, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway'
import { formatJSONResponse } from '@libs/api-gateway'
import { validateTransaction } from '@libs/transaction-validator'
import { middyfy } from '@libs/lambda'
import schema from './schema'
import { hasuraExecute } from '@libs/hasura-client'
import { isValidAlgoAddress } from '@libs/algosdk'

/**
 * Hasura option to call and validate the request
 * 
 */
const HASURA_OPERATION = `
mutation RemoveEscrowListingWithTx($id: uuid!) {
  delete_escrow_listings_by_pk(id: $id) {
    asset_id
    asset_unit
    application_id
    seller
  }
}`

const RemoveEscrowListingWithTx: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const { id, assetId, appId, wallet, txId } = event.body
  const { isValid, attributes } = await validateTransaction(txId, wallet, 'dp.listingRemove.escrow')

  console.log('attributes', attributes)

  const isValidCreatorAddress = await isValidAlgoAddress(attributes?.creator)
  const isValidSellerAddress = await isValidAlgoAddress(attributes?.seller)
  let isApplicationRemovalValid = false

  if (assetId && appId) {
    isApplicationRemovalValid = 
      attributes?.application_id === appId && 
      attributes?.asset_id === assetId
  }

  if (!isValidCreatorAddress) {
    return formatJSONError({
      errors: 'Invalid Algorand Creator Address'
    })
  }

  if (!isValidSellerAddress) {
    return formatJSONError({
      errors: 'Invalid Algorand Seller Address'
    })
  }

  if (!isValid || !isApplicationRemovalValid) {
    return formatJSONError({
      errors: 'Invalid Transaction'
    })
  } else {
    const { data, errors } = await hasuraExecute(HASURA_OPERATION, { id })

    // if Hasura operation errors, then throw error
    if (errors) {
      return formatJSONError({
        errors
      })
    }

    return formatJSONResponse({
      ...data.delete_escrow_listings_by_pk
    })
  }
}

export const main = middyfy(RemoveEscrowListingWithTx)