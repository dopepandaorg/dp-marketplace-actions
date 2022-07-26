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
mutation CreateCollectionWithTx($slug: String = null, $title: String!, $description: String = "", $creator: String!, $avatar_cid: String = "", $banner_cid: String = "") {
  insert_collections_one(on_conflict: {constraint: collections_pkey, update_columns: title}, object: {title: $title, slug: $slug, creator: $creator, avatar_cid: $avatar_cid, banner_cid: $banner_cid, description: $description}) {
    id
    avatar_cid
    banner_cid
    creator
    description
    slug
    title
    is_verified
  }
}`


const CreateCollectionWithTx: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const { wallet, txId } = event.body
  const { isValid, attributes } = await validateTransaction(txId, wallet, 'dp.collection')
  
  const isIPFS = attributes?.avatar_cid ? await isValidIPFS(attributes?.avatar_cid) : true
  const isValidAddress = await isValidAlgoAddress(wallet)

  if (!isValid) {
    return formatJSONError({
      errors: 'Invalid Transaction'
    })
  } else if (!isValidAddress) {
    return formatJSONError({
      errors: 'Invalid Algorand Address'
    })
  } else if (!isIPFS) {  
    return formatJSONError({
      errors: 'Invalid IPFS'
    })
  } else {
    // Load actions within hasura
    const { data, errors } = await hasuraExecute(HASURA_OPERATION, {
      title: attributes.title,
      description: attributes.description,
      creator: wallet
    })

    // if Hasura operation errors, then throw error
    if (errors) {
      return formatJSONError({
        errors
      })
    }

    // Return the response to hasura
    return formatJSONResponse({
      ...data.insert_collections_one
    })
  }
}

export const main = middyfy(CreateCollectionWithTx)
