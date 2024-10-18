import { Worker } from "./worker";
import { db } from "./db";
import { jobs } from "./db/schema";
import { eq } from "drizzle-orm";
import path from "node:path";
import { PENDING_UPLOAD_DIR } from "./config";
import { formatMsDuration } from "./utils";
import { createHash } from "blake3";
import * as multihash from "multihashes";

export class HashingWorker extends Worker {
  constructor() {
    super("Hashing");
  }

  protected async processNextJob(): Promise<void> {
    const hashingJob = await this.getNextJob("hashing");

    if (!hashingJob) {
      return;
    }

    const startTime = performance.now();

    this.log(`Hashing job ${hashingJob.id}`);

    try {
      const outputPath = path.join(PENDING_UPLOAD_DIR, hashingJob.fileName);
      const hash = await hashFile(outputPath);

      await db
        .update(jobs)
        .set({
          hash,
          status: "creating_asset",
        })
        .where(eq(jobs.id, hashingJob.id));

      const endTime = performance.now();
      const duration = endTime - startTime;
      this.log(`Job ${hashingJob.id} hashed in ${formatMsDuration(duration)}`);
    } catch (error) {
      this.error(`Error hashing job ${hashingJob.id}:`, error);
      await db
        .update(jobs)
        .set({
          status: "failed",
        })
        .where(eq(jobs.id, hashingJob.id));
    }
  }
}

async function hashFile(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  const stream = file.stream();
  const hash = createHash();
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  const encodedMultihash = multihash.encode(hash.digest(), "blake3");
  return multihash.toB58String(encodedMultihash);
}
