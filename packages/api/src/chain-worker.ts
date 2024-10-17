import { Worker } from "./worker";
import { db } from "./db";
import { jobs } from "./db/schema";
import { eq } from "drizzle-orm";
import { ApiPromise, HttpProvider } from "@polkadot/api";
import { Keyring } from "@polkadot/keyring";
import { type KeyringPair } from "@polkadot/keyring/types";
import { prepareUpdateVideoTx, submitExtrinsic } from "./js-api";
import { CHAIN_HTTP_RPC_URL, TRANSACTOR_ACCOUNT_MNEMONIC } from "./config";

export class ChainWorker extends Worker {
  private api: ApiPromise;
  private account: KeyringPair;

  protected constructor(api: ApiPromise) {
    super("Chain");
    this.api = api;
    const keyring = new Keyring({ type: "sr25519" });
    this.account = keyring.addFromUri(TRANSACTOR_ACCOUNT_MNEMONIC);
  }

  static async init(): Promise<ChainWorker> {
    const provider = new HttpProvider(CHAIN_HTTP_RPC_URL);
    const api = await ApiPromise.create({ provider });
    await api.isReady;
    return new ChainWorker(api);
  }

  protected async processNextJob(): Promise<void> {
    const job = await this.getNextJob("creating_asset");

    if (!job) {
      return;
    }

    this.log(`Processing job ${job.id}`);

    try {
      const tx = await prepareUpdateVideoTx(this.api, {
        videoId: job.video.id,
        media: {
          size: job.processedFileSize!,
          ipfsHash: job.hash!,
          duration: job.duration!,
          height: job.height!,
          width: job.width!,
          codec: "h264",
          container: "mp4",
          mimeType: "video/mp4",
        },
      });

      if (!tx) {
        throw new Error("Failed to prepare transaction");
      }

      const result = await submitExtrinsic(
        tx,
        this.account,
        CHAIN_HTTP_RPC_URL
      );

      this.log(
        `Asset created on-chain for job ${job.id}. Transaction hash: ${result.transactionHash}`
      );

      await db
        .update(jobs)
        .set({ status: "pending_upload" })
        .where(eq(jobs.id, job.id));
    } catch (error) {
      this.error(`Error creating asset for job ${job.id}:`, error);
      await db
        .update(jobs)
        .set({ status: "failed" })
        .where(eq(jobs.id, job.id));
    }
  }
}
