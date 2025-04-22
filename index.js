#!/usr/bin/env node
import fs from "fs";
import { Client } from "@nosana/sdk";

const [_, __, wallet, address, path, timeout, max, network] = process.argv;

const nosana = new Client(
  network ?? "mainnet",
  fs.readFileSync(wallet, "utf8")
);
console.log("Wallet address:", nosana.solana.wallet.publicKey.toString());
console.log(
  `SOL balance: ${(await nosana.solana.getSolBalance()) / 1000000000}`
);
console.log(
  `NOS balance: ${
    (await nosana.solana.getNosBalance())?.uiAmount?.toString() ?? "0"
  }`
);

async function postJobs(address, path, job_count) {
  const json_flow = JSON.parse(fs.readFileSync(path, "utf8"));
  const ipfs_hash = await nosana.ipfs.pin(json_flow);

  console.log(`Posting ${job_count} jobs.`);

  for (let i = 0; i < job_count; i++) {
    try {
      const response = await nosana.jobs.list(ipfs_hash, 60 * timeout, address);

      console.log(
        `Posted job to market: https://dashboard.nosana.com/jobs/${response.job}`
      );
    } catch (e) {
      console.error("Error posting job:", e);
    }
  }
}

async function main(address, path, max = 0) {
  const market = await nosana.jobs.getMarket(address);

  if (!market) {
    console.error("Market not found.");
    return;
  }

  switch (market.queueType) {
    case 255:
      console.log("Found empty market queue.");
      await postJobs(address, path, 2);
      break;
    case 1:
      let job_count = Math.ceil(market.queue.length / 2);

      if (max > 0 && max <= job_count) {
        job_count = max;
      }

      console.log("Nosana queue type detected.");
      console.log(`Found ${market.queue.length} hosts in queue.`);
      await postJobs(address, path, job_count);
      break;
    default:
      console.error("Market job queue type not supported.");
      return;
  }
}

await main(address, path, max);
