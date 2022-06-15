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
mutation UpdateEscrowListingWithTx($asset_id: bigint!, $creator: String!, $status: String!) {
  update_escrow_listings(where: {_and: {asset_id: {_eq: $asset_id}, creator: {_eq: $creator}}}, _set: {status: $status}) {
    returning {
      id
      creator
      asset_id
      status
      updated_at
    }
  }
}`


const UpdateEscrowListingWithTx: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const { wallet, txId } = event.body
  const { isValid, attributes } = await validateTransaction(txId, wallet, 'dp.setupEscrowListing')

  const isValidCreatorAddress = await isValidAlgoAddress(attributes?.creator)

  if (!isValidCreatorAddress) {
    return formatJSONError({
      errors: 'Invalid Algorand Creator Address'
    })
  }

  if (!isValid) {

    return formatJSONError({
      errors: 'Invalid Transaction'
    })
  } else {

    const { data, errors } = await hasuraExecute(HASURA_OPERATION, { asset_id: attributes.asset_id, creator: attributes.creator, status: attributes.status })

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

export const main = middyfy(UpdateEscrowListingWithTx)