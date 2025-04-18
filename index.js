#!/usr/bin/env node
import fs from "fs";
import { Client } from "@nosana/sdk";

const [_, __, wallet, address, path, max, network] = process.argv;

const nosana = new Client(network ?? "mainet", fs.readFileSync(wallet, "utf8"));
console.log("Wallet address:", nosana.solana.wallet.publicKey.toString());
console.log(
  `SOL balance: ${(await nosana.solana.getSolBalance()) / 1000000000}`
);
console.log(
  `NOS balance: ${
    (await nosana.solana.getNosBalance())?.uiAmount?.toString() ?? "0"
  }`
);

async function main(address, path, max) {
  const market = await nosana.jobs.getMarket(address);
  const json_flow = JSON.parse(fs.readFileSync(path, "utf8"));
  const ipfs_hash = await nosana.ipfs.pin(json_flow);

  const max_job =
    max && max <= Math.ceil(market.queue.length / 2)
      ? max
      : Math.ceil(market.queue.length / 2);

  console.log(`Found ${market.queue.length} hosts in queue.`);
  console.log(`Posting ${max_job} jobs.`);

  for (let i = 0; i < max_job; i++) {
    try {
      const response = await nosana.jobs.list(ipfs_hash, 60, address);

      console.log("Job posted!");
      console.log(`IPFS uploaded: ${nosana.ipfs.config.gateway + ipfs_hash}`);
      console.log(
        `Posted to market: https://dashboard.nosana.com/markets/${address}`
      );
      console.log(
        `Nosana Explorer: https://dashboard.nosana.com/jobs/${response.job}`
      );
    } catch (e) {
      console.error("Error posting job:", e);
    }
  }
}

await main(address, path, max);
