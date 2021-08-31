import {writable, Writable} from 'svelte/store';
import type {Invalidator, Subscriber, Unsubscriber} from 'web3w/dist/esm/utils/internals';
import {NFTS_ENDPOINT} from '$lib/graphql';
import {HookedQueryStore, QueryState, QueryStore} from '$lib/utils/stores/graphql';
import {chainTempo} from './chainTempo';

function fixURI(uri?: string): string {
  if (!uri) {
    return ''; // TODO error image
  }
  if (uri.startsWith('ipfs://')) {
    return 'https://ipfs.io/ipfs/' + uri.slice(7);
  }
  return uri;
}

export type NFTQueryResult = {
  tokens: {
    id: string;
    tokenURI: string;
    contract: {id: string; name?: string};
  }[];
};

type NFTData = {
  id: string;
  tokenURI: string;
  name: string;
  description: string;
  image: string;
  error?: string;
}[];

class NFTOfStore implements QueryStore<NFTData> {
  private queryStore: QueryStore<NFTQueryResult>;
  private store: Writable<QueryState<NFTData>>;
  private currentOwner?: string;
  private unsubscribeFromQuery: () => void | undefined;
  constructor(owner?: string) {
    this.currentOwner = owner?.toLowerCase();
    this.queryStore = new HookedQueryStore(
      NFTS_ENDPOINT,
      `
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
      chainTempo,
      {
        variables: {
          owner: this.currentOwner,
        },
      }
    );
    this.store = writable({step: 'IDLE'}, this.start.bind(this));
  }

  protected start() {
    this.unsubscribeFromQuery = this.queryStore.subscribe(this.update.bind(this));
  }

  protected stop() {
    if (this.unsubscribeFromQuery) {
      this.unsubscribeFromQuery();
    }
  }

  async _transform(result?: NFTQueryResult): Promise<NFTData> {
    // TODO cache
    const newResult: NFTData = [];
    if (!result) {
      return newResult;
    }
    for (const token of result.tokens) {
      if (token.tokenURI) {
        const tokenURI = fixURI(token.tokenURI);
        try {
          const response = await fetch(tokenURI);
          const json = await response.json();
          newResult.push({
            id: token.id,
            tokenURI,
            name: json.name,
            description: json.description,
            image: fixURI(json.image || json.image_url),
          });
        } catch (e) {
          newResult.push({
            id: token.id,
            tokenURI,
            name: '',
            description: '',
            image: '',
            error: e.message || e,
          }); // TODO error
        }
      } else {
        newResult.push({
          id: token.id,
          tokenURI: '',
          name:
            token.contract.id === '0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85'
              ? 'One ENS Name'
              : token.contract.name
              ? 'One ' + token.contract.name
              : 'Unknown',
          description: '',
          image: '',
        });
      }
    }
    return newResult;
  }

  private async update($query: QueryState<NFTQueryResult>): Promise<void> {
    const transformed = {
      step: $query.step,
      error: $query.error,
      data: await this._transform($query.data),
    };
    this.store.set(transformed);
  }

  acknowledgeError() {
    return this.queryStore.acknowledgeError();
  }

  subscribe(
    run: Subscriber<QueryState<NFTData>>,
    invalidate?: Invalidator<QueryState<NFTData>> | undefined
  ): Unsubscriber {
    return this.store.subscribe(run, invalidate);
  }
}

const cache: {[owner: string]: NFTOfStore} = {};
export function nftsof(owner?: string): NFTOfStore {
  owner = owner?.toLowerCase();
  const fromCache = cache[owner || ''];
  if (fromCache) {
    return fromCache;
  }
  return (cache[owner || ''] = new NFTOfStore(owner));
}
