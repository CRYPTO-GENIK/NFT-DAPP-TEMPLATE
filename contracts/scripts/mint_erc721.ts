import {getUnnamedAccounts, deployments} from 'hardhat';
const {execute} = deployments;

async function main() {
  const others = await getUnnamedAccounts();
  for (let i = 0; i < 3; i++) {
    const sender = others[i];
    await execute(
      'SimpleERC721',
      {from: sender, log: true, autoMine: true},
      'mint',
      5
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
