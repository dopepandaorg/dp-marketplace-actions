import algosdk from 'algosdk'

/**
 * Check if its a valid algo address
 *
 * @param address Algo address
 * @returns
 */
export const isValidAlgoAddress = (address: string) => {
	return algosdk.isValidAddress(address)
}