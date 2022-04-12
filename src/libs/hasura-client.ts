const fetch = require("node-fetch")

/**
 * Execute the parent operation in Hasura
 */
export const hasuraExecute = async (operation: string, variables: any) => {
    const fetchResponse = await fetch(
        process.env.HASURA_API,
        {
            method: 'POST',
            body: JSON.stringify({
                query: operation,
                variables
            }),
            headers: {
                'x-hasura-admin-secret': process.env.HASURA_SECRET
            }
        }
    )
    const data = await fetchResponse.json()
    console.log('DEBUG: ', data)
    return data
}