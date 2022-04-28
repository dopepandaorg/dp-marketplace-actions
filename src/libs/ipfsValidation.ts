import { cid } from 'is-ipfs'

/**
 * Check if its a valid ipfs cid
 *
 * @param address Algo address
 * @returns
 */
export const isValidIPFS = (cidHash: string) => {
    return cid(cidHash)
}