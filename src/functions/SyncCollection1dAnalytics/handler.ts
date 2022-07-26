import { hasuraExecute } from '@libs/hasura-client' 
import { formatJSONError, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway'
import { formatJSONResponse } from '@libs/api-gateway'
import { middyfy } from '@libs/lambda'
import schema from './schema'

// Get a list of all collections
const HASURA_GET_COLLECTION_OPERATION = `
  query GetCollections {
    collections {
      id
      pattern_prefix
      title
    }
  }
`
const HASURA_GET_PRICE_DATA = `
  query GetEscrowPrices {
    escrow_listings(order_by: {sale_price: asc, asset_id: asc}, distinct_on: asset_id, where: {status: {_eq: "active"}}) {
      sale_price
      asset_id
      asset_unit
      status
    }
  }
`

const HASURA_GET_SALE_DATA = `
  query GetEscrowSales($ts: timestamptz!, $ts24ago: timestamptz!) {
    escrow_listings(where: { status: {_eq: "escrow_sold"}, sale_date: {_gt: $ts24ago, _lte: $ts} }) {
      asset_id
      asset_unit
      sale_price
      sale_qty
      sale_fee
      sale_royalty
    }
  }
`
// Insert collection analytics
const HASURA_PUT_COLLECTION_ANALYTICS_OPERATION = `
  mutation UpdateCollectionAnalytics($objects: [collections_analytics_1d_insert_input!]!) {
    insert_collections_analytics_1d(objects: $objects, on_conflict: {constraint: collections_analytics_1d_collection_ts_key, update_columns: [volume, total_items, floor_price]}) {
      returning {
        id
        ts
      }
    }
  }
`

const SyncCollection1dAnalytics: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async () => {
  const date = new Date()

  const ts = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(),
    date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()));

  const ts24ago = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(),
    date.getUTCDate(), 0, 0, 0));

  const tsDate = new Date(ts)
  const ts24agoDate = new Date(ts24ago)

  console.time('Updating collections analytics')
  console.log('timestamp now', tsDate.toISOString(), ts24agoDate.toISOString())

  const { data: collectionsData, error: collectionsError } = await hasuraExecute(HASURA_GET_COLLECTION_OPERATION, {})
  const { data: pricesData, error: pricesError } = await hasuraExecute(HASURA_GET_PRICE_DATA, {})
  const { data: saleData, error: saleError } = await hasuraExecute(HASURA_GET_SALE_DATA, { ts: tsDate.toISOString(), ts24ago: ts24agoDate.toISOString() })

  if (collectionsError) {
    console.log('DEBUG: ', 'Error in fetching active collections', collectionsError)

    return formatJSONError({
      errors: {
        "message": 'Invalid Transaction'
      }
    })
  } else if (pricesError) {
    console.log('DEBUG: ', 'Error in fetching prices data', pricesError)

    return formatJSONError({
      errors: {
        "message": 'Invalid Transaction'
      }
    })
  } else if (saleError) {
    console.log('DEBUG: ', 'Error in fetching sale data', saleError)

    return formatJSONError({
      errors: {
        "message": 'Invalid Transaction'
      }
    })
  } else {
    console.log('collections', collectionsData, collectionsError)
    console.log('prices', pricesData, pricesError)
    console.log('sale', saleData, saleError)

    const collections = collectionsData.collections
    const collectionAnalytics = []

    collections.map(c => {
      let volume = 0
      let count = 0
      let floor = 0

      if (!!c.pattern_prefix) {
        const matchPrices = pricesData.escrow_listings
          .filter(p => !!p.asset_unit)
          .filter(p => p.asset_unit.toLowerCase().startsWith(c.pattern_prefix.toLowerCase()))

        const matchSales = saleData.escrow_listings
          .filter(s => !!s.asset_unit)
          .filter(s => s.asset_unit.toLowerCase().startsWith(c.pattern_prefix.toLowerCase()))
          
          matchSales.map(ms => {
            volume += ms.sale_price
            count += ms.sale_qty
          })
    
          matchPrices.map(mp => {
            floor = floor === 0 ? mp.sale_price : Math.min(floor, mp.sale_price)
          })
    
          console.log('matching floor price', matchPrices.length, floor)
      }
      
      collectionAnalytics.push({
        ts: ts24agoDate.toISOString(),
        collection: c.id,
        volume,
        total_items: count,
        floor_price: floor
      })
    })

    // Update hasura
    if (collectionAnalytics.length > 0) {
      try {
        await hasuraExecute(HASURA_PUT_COLLECTION_ANALYTICS_OPERATION, {
          objects: collectionAnalytics
        })
      } catch (errors) {
        console.log('DEBUG: Error in updating vote', errors)
        
        return formatJSONError({
          errors
        })
      }
    }

    console.timeEnd('Updating collections analytics')

    return formatJSONResponse({
      collectionAnalytics
    }) 
  }
}

export const main = middyfy(SyncCollection1dAnalytics)
