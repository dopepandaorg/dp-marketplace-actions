const fetch = require("node-fetch")

/**
 * Chcek balance
 */
const BALANCE_API = (wallet: string, assetId: number) => `https://${process.env.NETWORK_ENV}-algorand.api.purestake.io/idx2/v2/accounts/${wallet}/assets?asset-id=${assetId}`

export const walletBalance = async (wallet: string, assetId: number) => {
    let isValid = false
    let balance = 0
    let round

    const fetchResponse = await fetch(BALANCE_API(wallet, assetId), {
        headers: {
            'x-api-key': process.env.PURESTAKE_API_KEY
        }
    })

    const data = await fetchResponse.json()

    if (data && data.assets) {
        const assets = data.assets
        const foundAsset = assets.find(a => a['asset-id'] === assetId)

        if (foundAsset) {
            balance = foundAsset.amount

        }
    }

    if (data && data['current-round']) {
        round = data['current-round']
    }

    console.log('Transaction wallet data current round', isValid, balance, round)

    return { isValid, balance, round }
}
