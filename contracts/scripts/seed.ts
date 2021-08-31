import {getUnnamedAccounts, deployments} from 'hardhat';
const {execute} = deployments;

const messages = [
  'Hello',
  '你好',
  'سلام',
  'здравствуйте',
  'Habari',
  'Bonjour',
  'नमस्ते',
];

async function main() {
  const others = await getUnnamedAccounts();
  for (let i = 0; i < messages.length; i++) {
    const sender = others[i];
    if (sender) {
      await execute(
        'GreetingsRegistry',
        {from: sender, log: true, autoMine: true},
        'setMessage',
        messages[i]
      );
      await execute(
        'SimpleERC721',
        {from: sender, log: true, autoMine: true},
        'mint',
        5
      );
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
