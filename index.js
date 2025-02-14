import fs from "fs";

import { Client } from "@nosana/sdk";
import { PublicKey } from "@solana/web3.js";

const [_, __, wallet, address, path, max] = process.argv;

const nosana = new Client("devnet", fs.readFileSync(wallet, "utf8"));

async function main(address, path, max) {
  const market = await nosana.jobs.getMarket(address);
  const json_flow = JSON.parse(fs.readFileSync(path, "utf8"));
  const ipfs_hash = await nosana.ipfs.pin(json_flow);

  const max_job =
    max && max <= Math.ceil(market.queue.length / 2)
      ? max
      : Math.ceil(market.queue.length / 2);

  console.log(`
Found ${market.queue.length} hosts in queue.
Posting ${max_job} jobs.
  `);

  for (let i = 0; i < max_job; i++) {
    const response = await nosana.jobs.list(
      ipfs_hash,
      60,
      new PublicKey(address)
    );
    console.log(`
Job posted!
IPFS uploaded: ${nosana.ipfs.config.gateway + ipfs_hash}
Posted to market: https://dashboard.nosana.com/markets/${address}
Nosana Explorer: https://dashboard.nosana.com/jobs/${response.job}
      `);
  }
}

await main(address, path, max);
