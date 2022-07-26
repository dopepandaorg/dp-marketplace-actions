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
mutation UpdateEscrowListingWithTx($id: uuid!, $status: String!, $sale_date: timestamptz!) {
  update_escrow_listings_by_pk(pk_columns: {id: $id}, _set: {status: $status, sale_date: $sale_date}) {
    status
    id
    asset_id
    application_id
    application_address
    creator
    created_at
    updated_at
  }
}`


const UpdateEscrowListingWithTx: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const { wallet, txId, escrowId } = event.body
  const { isValid } = await validateTransaction(txId, wallet)

  if (!isValid) {
    return formatJSONError({
      errors: 'Invalid Transaction'
    })
  } else {

    const { data, errors } = await hasuraExecute(HASURA_OPERATION, { id: escrowId, status: 'escrow_sold', sale_date: new Date().toISOString() })

    // if Hasura operation errors, then throw error
    if (errors) {
      return formatJSONError({
        errors
      })
    }

    return formatJSONResponse({
      ...data.update_escrow_listings_by_pk
    })
  }
}

export const main = middyfy(UpdateEscrowListingWithTx)