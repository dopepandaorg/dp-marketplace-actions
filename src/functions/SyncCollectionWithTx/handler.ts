import { formatJSONError, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway'
import { formatJSONResponse } from '@libs/api-gateway'
import { validateTransaction } from '@libs/transaction-validator'
import { middyfy } from '@libs/lambda'
import { hasuraExecute } from '@libs/hasura-client'
import schema from './schema'

const HASURA_OPERATION = `
mutation SyncCollectionWithTx($id: uuid!, $object: collections_set_input) {
  update_collections_by_pk(pk_columns: {id: $id}, _set: $object) {
    title
    slug
    description
    pattern_prefix
    avatar_cid
    banner_cid
    social_website
    social_twitter
    social_discord
  }
}`


const SyncCollectionWithTx: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const { id, wallet, txId } = event.body
  const { isValid, attributes } = await validateTransaction(txId, wallet, 'dp.collection')

  const updateAttributes = {} as any

  Object.keys(attributes).map(keys => {
    updateAttributes[keys] = attributes[keys]
  })

  if (!isValid) {

    return formatJSONError({
      errors: 'Invalid Transaction'
    })
  } else {
    const { data, errors } = await hasuraExecute(HASURA_OPERATION, { id, object: updateAttributes })

    // if Hasura operation errors, then throw error
    if (errors) {
      return formatJSONError({
        errors
      })
    }

    return formatJSONResponse({
      ...data.update_collections_by_pk
    })
  }
}

export const main = middyfy(SyncCollectionWithTx)
