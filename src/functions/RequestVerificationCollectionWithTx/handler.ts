import { formatJSONError, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway'
import { formatJSONResponse } from '@libs/api-gateway'
import { validateTransaction } from '@libs/transaction-validator'
import { middyfy } from '@libs/lambda'
import schema from './schema'
import { hasuraExecute } from '@libs/hasura-client'
import { isValidAlgoAddress } from '@libs/algosdk'
import { isValidIPFS } from '@libs/ipfsValidation'

/**
 * Hasura option to call and validate the request
 * 
 */
const HASURA_OPERATION = `
mutation RequestVerificationCollectionWithTx($object: verification_request_collection_insert_input!) {
  insert_verification_request_collection_one(object: $object){
    updated_at
    created_at
    collection_name
    note
    requestor
    id
  }
}`


const RequestVerificationCollectionWithTx: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const { wallet, txId } = event.body
  const { isValid, attributes } = await validateTransaction(txId, wallet, 'dp.requestVerification.collection')

  const isValidAddress = await isValidAlgoAddress(attributes?.requestor)

  if (!isValidAddress) {
    return formatJSONError({
      errors: 'Invalid Algorand Address'
    })
  }
  const reqCollectionInsertAttribute = {} as any

  Object.keys(attributes).map(keys => {
    reqCollectionInsertAttribute[keys] = attributes[keys]
  })



  if (!isValid) {

    return formatJSONError({
      errors: 'Invalid Transaction'
    })
  } else {

    const { data, errors } = await hasuraExecute(HASURA_OPERATION, { object: reqCollectionInsertAttribute })

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

export const main = middyfy(RequestVerificationCollectionWithTx)