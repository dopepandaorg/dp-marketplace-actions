import { hasuraExecute } from '@libs/hasura-client' 
import { formatJSONError, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway'
import { formatJSONResponse } from '@libs/api-gateway'
import { middyfy } from '@libs/lambda'
import schema from './schema'
import { walletBalance } from '@libs/wallet-balance'

const DPANDA_ASSET_ID = process.env.NETWORK_ENV === 'mainnet' ? 391379500 : 85326355
const ONE_MILLION_DPANDA = 1000000 * (1000 * 1000)

const HASURA_GET_OPERATION = `
  query GetContestVotes($contest_id: uuid) {
    contest_entries_votes(where: {contest_id: {_eq: $contest_id}}) {
      voter
      asset_id
      updated_at_round
      tx_id
    }
  }
`

const HASURA_PUT_OPERATION = `
  mutation UpdateContestVote($objects: [contest_entries_votes_insert_input!]!) {
    insert_contest_entries_votes(objects: $objects, on_conflict: {constraint: contest_entries_votes_contest_id_asset_id_voter_key, update_columns: [weight_dpanda, updated_at_round]}) {
      returning {
        voter
        tx_id
      }
    }
  }

`

const SyncVotesWeightByContest: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const { payload } = event.body

  const contestId = payload.contestId
  const { data, error } = await hasuraExecute(HASURA_GET_OPERATION, { contest_id: contestId })

  if (error) {
    console.log('DEBUG: ', 'Error in fetching votes', error)

    return formatJSONError({
      errors: {
        "message": 'Invalid Transaction'
      }
    })
  } else {
    let updatedVotes = []
    const votes = data.contest_entries_votes

    console.time('Updating vote entries')
    
    // Loop through all vote balances
    await Promise.all(votes.map(async vote => {
      let { balance, round } = await walletBalance(vote.voter, DPANDA_ASSET_ID)
      
      if (typeof round !== 'undefined') {
        const balanceAdjusted = Math.min(balance, ONE_MILLION_DPANDA)
        
        updatedVotes.push({
          contest_id: contestId,
          voter: vote.voter,
          asset_id: vote.asset_id,
          tx_id: vote.tx_id,
          weight_dpanda: balanceAdjusted,
          updated_at_round: round
        })
      }
    }))

    // Update hasura
    if (updatedVotes.length > 0) {
      try {
        await hasuraExecute(HASURA_PUT_OPERATION, {
          objects: updatedVotes
        })
      } catch (errors) {
        console.log('DEBUG: Error in updating vote', error)
        
        return formatJSONError({
          errors
        })
      }
    }

    console.timeEnd('Updating vote entries')

    return formatJSONResponse({
      updatedVotes
    }) 
  }
}

export const main = middyfy(SyncVotesWeightByContest)
