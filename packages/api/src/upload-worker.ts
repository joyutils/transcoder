import { Worker } from "./worker";
import { getChannelStorageEndpoints } from "./qn-api";
import { PENDING_UPLOAD_DIR } from "./config";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { jobs } from "./db/schema";

export class UploadWorker extends Worker {
  constructor() {
    super("Upload");
  }

  protected async processNextJob(): Promise<void> {
    const job = await this.getNextJob("uploading", 20);

    if (!job) {
      return;
    }

    this.log(`Processing job ${job.id}`);

    try {
      const { endpoint, bucketId } = await getChannelStorageEndpoints(
        job.video.channelId
      );

      const formData = new FormData();
      const filePath = path.join(PENDING_UPLOAD_DIR, job.fileName);
      const file = Bun.file(filePath);
      formData.append("file", file, job.fileName);

      const uploadUrl = new URL("api/v1/files", endpoint);
      uploadUrl.searchParams.set("dataObjectId", job.dataObjectId!);
      uploadUrl.searchParams.set("storageBucketId", bucketId);
      uploadUrl.searchParams.set(
        "bagId",
        `dynamic:channel:${job.video.channelId}`
      );

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": "transcoder/0.1.0",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        console.log(data);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.log(`File uploaded successfully for job ${job.id}`);

      await db
        .update(jobs)
        .set({ status: "completed" })
        .where(eq(jobs.id, job.id));
    } catch (error) {
      this.error(`Error uploading file for job ${job.id}:`, error);
      await db
        .update(jobs)
        .set({ status: "failed" })
        .where(eq(jobs.id, job.id));
    }
  }
}
