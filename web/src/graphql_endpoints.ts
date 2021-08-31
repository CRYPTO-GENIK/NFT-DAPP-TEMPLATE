import {EndPoint} from './lib/graphql';

export const MESSAGES = new EndPoint(
  import.meta.env.SNOWPACK_PUBLIC_THE_GRAPH_HTTP
);

export const NFTS = new EndPoint(
  import.meta.env.SNOWPACK_PUBLIC_THE_GRAPH_NFT_HTTP
);
