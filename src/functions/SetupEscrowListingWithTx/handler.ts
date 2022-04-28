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
mutation SetupEscrowListingWithTx($object: escrow_listings_insert_input!) {
  insert_escrow_listings_one(object: $object){
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
  const escrowListingsInsertAttribute = {} as any

  Object.keys(attributes).map(keys => {
    escrowListingsInsertAttribute[keys] = attributes[keys]
  })



  if (!isValid) {

    return formatJSONError({
      errors: 'Invalid Transaction'
    })
  } else {

    const { data, errors } = await hasuraExecute(HASURA_OPERATION, { object: escrowListingsInsertAttribute })

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