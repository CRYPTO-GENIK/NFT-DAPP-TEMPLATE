import {EndPoint} from '$lib/utils/graphql/endpoint';
import {graphNodeURL, nftGraphNodeURL} from '$lib/config';

export const SUBGRAPH_ENDPOINT = new EndPoint(graphNodeURL);
export const NFTS_ENDPOINT = new EndPoint(nftGraphNodeURL);
