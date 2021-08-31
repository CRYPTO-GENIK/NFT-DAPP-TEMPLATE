<script lang="ts">
  import WalletAccess from '../templates/WalletAccess.svelte';
  import NavButton from '../components/navigation/NavButton.svelte';
  import {nftsof} from '../stores/nftsof';
  import {wallet, flow, chain} from '../stores/wallet';

  $: nfts = nftsof($wallet.address);
</script>

<WalletAccess>
  {#if $wallet.state !== 'Ready'}
    <div
      class="w-full h-full mx-auto flex items-center justify-center text-black dark:text-white ">
      <form class="mt-5 w-full max-w-sm">
        <div class="flex items-center">
          <NavButton
            label="Connect"
            disabled={$wallet.unlocking || $chain.connecting}
            on:click={() => flow.connect()}>
            Connect
          </NavButton>
        </div>
      </form>
    </div>
  {:else}
    <section
      class="py-8 px-4 w-full h-full mx-auto flex items-center justify-center text-black dark:text-white ">
      {#if $nfts.state === 'Idle'}
        <div>NFTS not loaded</div>
      {:else if $nfts.error}
        <div>Error: {$nfts.error}</div>
      {:else if $nfts.state === 'Loading'}
        <div>Loading NFTs...</div>
      {:else}
        <div
          class="w-full h-full grid sm:grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 max-w-4xl mx-auto p-8">
          {#each $nfts.tokens as nft, index}
            <div
              id={nft.id}
              class="rounded overflow-hidden shadow-lg h-40 border-gray-400 dark:border-gray-700 border-4 p-1 text-center flex items-center justify-center">
              {#if nft.error}
                Error:
                {nft.error}
              {:else if nft.image}
                <img
                  style="image-rendering: pixelated;"
                  class="object-contain h-full w-full"
                  alt={nft.name}
                  src={nft.image} />
              {:else}
                <p class="">{nft.name}</p>
              {/if}
            </div>
          {:else}You do not have any NFT{/each}
        </div>
      {/if}
    </section>
  {/if}
</WalletAccess>
