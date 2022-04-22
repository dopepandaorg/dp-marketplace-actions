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
mutation CreateCollectionWithTx($object: collections_insert_input!) {
  insert_collections_one(object: $object){
    creator
    description
    thumbnail_cid
    title
    id
  }
}`


const CreateCollectionWithTx: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const { wallet, txId } = event.body
  const { isValid, attributes } = await validateTransaction(txId, wallet, 'dp.collection')
  const isIPFS = await isValidIPFS(attributes?.thumbnail_cid)


  const isValidAddress = await isValidAlgoAddress(attributes?.creator)

  if (!isValidAddress) {
    return formatJSONError({
      errors: 'Invalid Algorand Address'
    })
  }
  const collectionInsertAttribute = {} as any

  Object.keys(attributes).map(keys => {
    collectionInsertAttribute[keys] = attributes[keys]
  })



  if (!isValid) {

    return formatJSONError({
      errors: 'Invalid Transaction'
    })
  } else if (!isIPFS) {
    console.info('DEBUG: isIPFS', isIPFS)
    return formatJSONError({
      errors: 'Invalid IPFS'
    })
  } else {

    const { data, errors } = await hasuraExecute(HASURA_OPERATION, { object: collectionInsertAttribute })

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

export const main = middyfy(CreateCollectionWithTx)
