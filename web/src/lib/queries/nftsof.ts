import {NFTS_ENDPOINT} from '$lib/graphql';
import type {OperationResult} from '@urql/core';

export type NFTQueryResult = {
  tokens: {
    id: string;
    tokenURI: string;
    contract: {id: string; name?: string};
  }[];
};

export async function queryNFTsOf(owner: string): Promise<OperationResult<NFTQueryResult>> {
  return NFTS_ENDPOINT.query({
    query: `
    query($owner: String) {
      tokens(first: 100 where: {owner: $owner}) {
        id
        tokenURI
        contract {
          id
          name
        }
      }
    }`,
    variables: {owner},
  });
}
