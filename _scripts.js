#!/usr/bin/env node
'use strict';
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const {spawn} = require('child_process');

const commandlineArgs = process.argv.slice(2);

function parseArgs(rawArgs, numFixedArgs, expectedOptions) {
  const fixedArgs = [];
  const options = {};
  const extra = [];
  const alreadyCounted = {};
  for (let i = 0; i < rawArgs.length; i++) {
    const rawArg = rawArgs[i];
    if (rawArg.startsWith('--')) {
      const optionName = rawArg.slice(2);
      const optionDetected = expectedOptions[optionName];
      if (!alreadyCounted[optionName] && optionDetected) {
        alreadyCounted[optionName] = true;
        if (optionDetected === 'boolean') {
          options[optionName] = true;
        } else {
          i++;
          options[optionName] = rawArgs[i];
        }
      } else {
        if (fixedArgs.length < numFixedArgs) {
          throw new Error(`expected ${numFixedArgs} fixed args, got only ${fixedArgs.length}`);
        } else {
          extra.push(rawArg);
        }
      }
    } else {
      if (fixedArgs.length < numFixedArgs) {
        fixedArgs.push(rawArg);
      } else {
        for (const opt of Object.keys(expectedOptions)) {
          alreadyCounted[opt] = true;
        }
        extra.push(rawArg);
      }
    }
  }
  return {options, extra, fixedArgs};
}

function execute(command) {
  return new Promise((resolve, reject) => {
    const onExit = (error) => {
      if (error) {
        return reject(error);
      }
      resolve();
    };
    spawn(command.split(' ')[0], command.split(' ').slice(1), {
      stdio: 'inherit',
      shell: true,
    }).on('exit', onExit);
  });
}

function getEnv(network) {
  let env = 'dotenv -e .env -e contracts/.env -- ';
  if (network && network !== 'localhost') {
    env = `dotenv -e .env.${network} -e .env -e contracts/.env -- `;
  }
  return env;
}

async function performAction(rawArgs) {
  const firstArg = rawArgs[0];
  const args = rawArgs.slice(1);
  // console.log({firstArg, args});
  if (firstArg == 'contracts:dev') {
    const {fixedArgs, extra, options} = parseArgs(args, 0, {reset: 'boolean'});
    if (options.reset) {
      await execute('rimraf contracts/deployments/localhost && rimraf web/src/lib/contracts.json');
    }
    await execute(`wait-on tcp:localhost:8545`);
    await execute(
      `dotenv -e .env -e contracts/.env -- npm --prefix contracts run local:dev -- --export ../web/src/lib/contracts.json`
    );
  } else if (firstArg === 'contracts:deploy') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || 'localhost';
    const env = getEnv(network);
    await execute(
      `${env}npm --prefix contracts run deploy ${network} -- --export ../web/src/lib/contracts.json ${extra}`
    );
  } else if (firstArg === 'contracts:export') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0];
    if (!network) {
      console.error(`need to specify the network as first argument`);
      return;
    }
    const env = getEnv(network);
    await execute(`${env}npm --prefix contracts run export ${network} -- ../web/src/lib/contracts.json`);
  } else if (firstArg === 'seed') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || 'localhost';
    const env = getEnv(network);
    await execute(`wait-on web/src/lib/contracts.json`);
    await execute(`${env}npm --prefix contracts run execute ${network} scripts/seed.ts ${extra}`);
    // TODO execute command
  } else if (firstArg === 'subgraph:dev') {
    await execute(`dotenv -- npm --prefix subgraph run setup`);
    await execute(`wait-on web/src/lib/contracts.json`);
    await execute(`dotenv -- npm --prefix subgraph run dev ../contracts/deployments/localhost mainnet`);
  } else if (firstArg === 'subgraph:deploy') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || 'localhost';
    const env = getEnv(network);
    let deployCommand = 'deploy';
    if (network && network !== 'localhost') {
      deployCommand = 'hosted:deploy';
    }
    await execute(`wait-on web/src/lib/contracts.json`);
    console.log({env});
    await execute(`${env}npm --prefix subgraph run ${deployCommand} ../contracts/deployments/${network}`);
  } else if (firstArg === 'web:dev') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || 'localhost';
    const env = getEnv(network);
    await execute(`${env}npm --prefix web run dev`);
  } else if (firstArg === 'web:build') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || process.env.NETWORK_NAME || 'localhost';
    const env = getEnv(network);
    await execute(`${env}npm --prefix web run prepare`);
    await performAction(['contracts:export', network || 'localhost']);
    await execute(`${env}npm run common:build`);
    await execute(`${env}npm --prefix web run build`);
  } else if (firstArg === 'web:serve') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0];
    const env = getEnv(network);
    await execute(`${env}npm --prefix web run serve`);
  } else if (firstArg === 'web:build:serve') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || 'localhost';
    await performAction(['web:build', network || 'localhost']);
    await performAction(['web:serve', network || 'localhost']);
  } else if (firstArg === 'web:deploy') {
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0];
    if (!network) {
      console.error(`need to specify the network as first argument`);
      return;
    }
    const env = getEnv(network);
    await performAction(['web:build', network]);
    await execute(`${env}npm --prefix web run deploy`);
  } else if (firstArg === 'deploy') {
    //run-s staging:contracts staging:subgraph web:prepare common:build staging:web:rebuild staging:web:deploy
    const {fixedArgs, extra} = parseArgs(args, 1, {});
    const network = fixedArgs[0] || process.env.NETWORK_NAME;
    if (!network) {
      console.error(`need to specify the network as first argument (or via env: NETWORK_NAME)`);
      return;
    }
    await performAction(['contracts:deploy', network]);
    await performAction(['subgraph:deploy', network]);
    await performAction(['web:deploy', network]);
  } else if (firstArg === 'stop') {
    await execute(`docker-compose down -v`);
  } else if (firstArg === 'externals') {
    await execute(`docker-compose down -v`);
    await execute(`docker-compose up`);
  } else if (firstArg === 'dev') {
    execute(`newsh "npm run common:dev"`);
    execute(`newsh "npm run web:dev"`);
    execute(`newsh "npm run contracts:dev -- --reset"`);
    execute(`newsh "npm run subgraph:dev"`);
    await performAction(['common:build']);
    await performAction(['seed', 'localhost']);
  } else if (firstArg === 'start') {
    await execute(`docker-compose down -v`);
    execute(`newsh "npm run externals"`);
    execute(`newsh "npm run common:dev"`);
    execute(`newsh "npm run web:dev"`);
    execute(`newsh "npm run contracts:dev -- --reset"`);
    execute(`newsh "npm run subgraph:dev"`);
    await performAction(['common:build']);
    await performAction(['seed', 'localhost']);
  }
}

performAction(commandlineArgs);
