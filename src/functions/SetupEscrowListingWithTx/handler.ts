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
mutation SetupEscrowListingWithTx($asset_id: bigint!, $creator: String!, $seller: String!, $sale_qty: Int, $sale_price: bigint, $sale_royalty: Int, $sale_fee: Int, $application_version: Int, $application_id: Int, $application_address: String, $is_verified: Boolean = false, $status: String) {
  insert_escrow_listings_one(object: {asset_id: $asset_id, creator: $creator, seller: $seller, sale_qty: $sale_qty, sale_price: $sale_price, sale_royalty: $sale_royalty, sale_fee: $sale_fee, application_version: $application_version, application_id: $application_id, application_address: $application_address, is_verified: $is_verified, status: $status}){
    application_address
    application_id
    application_version
    asset_id
    created_at
    creator
    id
    is_verified
    sale_fee
    sale_price
    sale_qty
    sale_royalty
    seller
    status
    updated_at
  }
}`

const SetupEscrowListingWithTx: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const { wallet, txId } = event.body
  const { isValid, attributes } = await validateTransaction(txId, wallet, 'dp.setupEscrowListing')

  const isValidCreatorAddress = await isValidAlgoAddress(attributes?.creator)
  const isValidSellerAddress = await isValidAlgoAddress(attributes?.seller)

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
  if (+attributes?.sale_price <= 0) {
    return formatJSONError({
      errors: 'Sale price can\'t be lower than 0'
    })
  }

  if (+attributes?.sale_fee <= 0 || +attributes?.sale_fee > 40) {
    return formatJSONError({
      errors: 'Sale fee should be between 0 to 40'
    })
  }
  if (+attributes?.sale_royalty <= 0 || +attributes?.sale_royalty > 40) {
    return formatJSONError({
      errors: 'Sale royalty should be between 0 to 40'
    })
  }

  if (!isValid) {
    return formatJSONError({
      errors: 'Invalid Transaction'
    })
  } else {

    const { data, errors } = await hasuraExecute(HASURA_OPERATION, { asset_id: attributes.asset_id, creator: attributes.creator, seller: attributes.seller, sale_qty: attributes.sale_qty, sale_price: attributes.sale_price, sale_royalty: attributes.sale_royalty, sale_fee: attributes.sale_fee, application_version: attributes.application_version, application_id: attributes.application_id, application_address: attributes.application_address, is_verified: attributes.is_verified, status: attributes.status })

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

export const main = middyfy(SetupEscrowListingWithTx)