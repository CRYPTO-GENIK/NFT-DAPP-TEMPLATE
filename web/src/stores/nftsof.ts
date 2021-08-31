import {BaseStore} from '../lib/utils/stores';
import {queryNFTsOf, NFTQueryResult} from '../queries/nftsof';

function fixURI(uri?: string): string {
  if (!uri) {
    return ''; // TODO error image
  }
  if (uri.startsWith('ipfs://')) {
    return 'https://ipfs.io/ipfs/' + uri.slice(7);
  }
  return uri;
}

type NFTData = {
  id: string;
  tokenURI: string;
  name: string;
  description: string;
  image: string;
  error?: string;
}[];

type NFTs = {
  state: 'Idle' | 'Loading' | 'Ready';
  error?: unknown;
  tokens: NFTData;
};

class NFTOfStore extends BaseStore<NFTs> {
  private timer: NodeJS.Timeout | undefined;
  private counter = 0;
  private currentOwner?: string;
  constructor(owner?: string) {
    super({
      state: 'Idle',
      error: undefined,
      tokens: [],
    });
    this.currentOwner = owner?.toLowerCase();
  }

  async _transform(result: NFTQueryResult): Promise<NFTData> {
    // TODO cache
    const newResult: NFTData = [];
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

  subscribe(
    run: (value: NFTs) => void,
    invalidate?: (value?: NFTs) => void
  ): () => void {
    if (this.counter === 0) {
      this.start();
    }
    this.counter++;
    const unsubscribe = super.subscribe(run, invalidate);
    return () => {
      this.counter--;
      if (this.counter === 0) {
        this.stop();
      }
      unsubscribe();
    };
  }

  start(): NFTOfStore | void {
    console.log('start ' + this.currentOwner);
    this.setPartial({state: 'Loading'});
    this._fetch();
    this.timer = setInterval(() => this._fetch(), 5000); // TODO polling interval config
    return this;
  }

  async _fetch() {
    const owner = this.currentOwner;
    console.log({owner});
    if (owner) {
      const result = await queryNFTsOf(owner);
      // console.log({result});
      const transformed = await this._transform(result);
      // console.log({transformed});
      if (owner === this.currentOwner) {
        this.setPartial({tokens: transformed, state: 'Ready'});
      }
    } else {
      this.setPartial({tokens: [], state: 'Ready'});
    }
  }

  stop() {
    console.log('stop ' + this.currentOwner);
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  acknowledgeError() {
    this.setPartial({error: undefined});
  }
}

const cache: {[owner: string]: NFTOfStore} = {};
export function nftsof(owner?: string): NFTOfStore {
  const fromCache = cache[owner || ''];
  if (fromCache) {
    return fromCache;
  }
  return (cache[owner || ''] = new NFTOfStore(owner));
}
