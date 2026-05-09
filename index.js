#!/usr/bin/env node
import fs from "fs";
import { createNosanaClient, createWalletFromBase58, createWalletFromBytes } from "@nosana/kit";

const [
  _,
  __,
  wallet,
  address,
  path,
  timeout,
  max,
  network,
  disable_empty_posting,
] = process.argv;

const nosana = createNosanaClient(network ?? "mainnet");
const walletFileContent = fs.readFileSync(wallet, "utf8").trim();
nosana.wallet = walletFileContent.startsWith("[")
  ? await createWalletFromBytes(JSON.parse(walletFileContent))
  : await createWalletFromBase58(walletFileContent);
console.log("Wallet address:", nosana.wallet?.address?.toString());
console.log(
  `SOL balance: ${(await nosana.solana.getBalance()) / 1000000000}`
);
console.log(
  `NOS balance: ${(await nosana.nos.getBalance())?.toString() ?? "0"}`
);

async function postJobs(address, path, job_count) {
  const json_flow = JSON.parse(fs.readFileSync(path, "utf8"));
  const ipfs_hash = await nosana.ipfs.pin(json_flow);

  console.log(`Posting ${job_count} jobs.`);

  for (let i = 0; i < job_count; i++) {
    try {
      const instruction = await nosana.jobs.list({
        ipfsHash: ipfs_hash,
        timeout: 60 * parseInt(timeout),
        market: address
      });

      const txSignature = await nosana.solana.buildSignAndSend(instruction);
      console.log(
        `Posted job with transaction: ${txSignature}`
      );
    } catch (e) {
      console.error("Error posting job:", e);
    }
  }
}

async function main(address, path, max = 0) {
  const market = await nosana.jobs.market(address);

  if (!market) {
    console.error("Market not found.");
    return;
  }

  switch (market.queueType) {
    case 0: // JOB_QUEUE
      if (market.queue.length === 0) {
        if (disable_empty_posting === "true") {
          console.log("Empty market queue posting is disabled.");
          break;
        }
        console.log("Found empty market queue.");
        await postJobs(address, path, 2);
      } else {
        console.log("Found job queue with items.");
        let job_count = Math.ceil(market.queue.length / 2);

        if (max > 0 && max <= job_count) {
          job_count = max;
        }

        console.log(`Found ${market.queue.length} jobs in queue.`);
        await postJobs(address, path, job_count);
      }
      break;
    case 1: // NODE_QUEUE
      let job_count = Math.ceil(market.queue.length / 2);

      if (max > 0 && max <= job_count) {
        job_count = max;
      }

      console.log("Node queue type detected.");
      console.log(`Found ${market.queue.length} nodes in queue.`);
      await postJobs(address, path, job_count);
      break;
    default:
      console.error("Market queue type not supported.");
      return;
  }
}

await main(address, path, max);
