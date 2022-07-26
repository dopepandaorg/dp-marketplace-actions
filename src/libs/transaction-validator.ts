const fetch = require("node-fetch")

/**
 * 
 */
const TRANSACTION_API = (txId: string) => `https://${process.env.NETWORK_ENV}-algorand.api.purestake.io/idx2/v2/transactions/${txId}`

export const validateTransaction = async (txId: string, sender: string, prefix?: string): Promise<{ isValid: boolean, attributes: any }> => {
    let isValid
    let attributes

    const fetchResponse = await fetch(TRANSACTION_API(txId), {
        headers: {
            'x-api-key': process.env.PURESTAKE_API_KEY
        }
    })

    const data = await fetchResponse.json()

    console.log('Transaction fetch data', data)

    if (data && data.transaction) {
        const txn = data.transaction

        // run some business logic
        if (txn.sender === sender && txn.note) {
            const data = Buffer.from(txn.note, 'base64').toString('ascii')
            const attrs = data.match(/(?<=\().+?(?=\))/g)
            console.log('pass check 1', txn.sender, txn.note, data, attrs, prefix)

            isValid = (prefix ? data.startsWith(prefix) : true)

            if (isValid && attrs.length > 0) {
                attributes = JSON.parse(attrs[0])
                console.log('data attribute check', data, attrs, attributes)
                console.log('pass check 2')
            } else {
                console.log('fail check 2')
            }
        } else if (txn.sender === sender && (!txn.note && !prefix)) {
            isValid = true
        }
    }

    return { isValid, attributes }
}
