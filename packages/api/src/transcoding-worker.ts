import { Worker } from "./worker";
import { db } from "./db";
import { jobs } from "./db/schema";
import { eq } from "drizzle-orm";
import { stat, unlink } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { PENDING_PROCESSING_DIR, PENDING_UPLOAD_DIR } from "./config";
import { getVideoInfo } from "./video-utils";
import { formatMb, formatMsDuration } from "./utils";

export class TranscodingWorker extends Worker {
  constructor() {
    super("Transcoding");
  }

  protected async processNextJob(): Promise<void> {
    const pendingJob = await this.getNextJob("pending_processing");

    if (!pendingJob) {
      return;
    }

    const startTime = performance.now();

    this.log(`Transcoding job ${pendingJob.id}`);

    try {
      await db
        .update(jobs)
        .set({ status: "processing" })
        .where(eq(jobs.id, pendingJob.id));

      const inputPath = path.join(PENDING_PROCESSING_DIR, pendingJob.fileName);
      const outputPath = path.join(PENDING_UPLOAD_DIR, `${pendingJob.id}.mp4`);

      await this.processVideo(pendingJob.id, inputPath, outputPath);

      const videoInfo = await getVideoInfo(outputPath);
      const outputSize = await this.getFileSize(outputPath);

      await db
        .update(jobs)
        .set({
          status: "hashing",
          duration: Math.round(videoInfo.duration),
          height: videoInfo.height,
          width: videoInfo.width,
          processedFileSize: outputSize,
        })
        .where(eq(jobs.id, pendingJob.id));

      const endTime = performance.now();
      const duration = endTime - startTime;
      this.log(
        `Job ${pendingJob.id} transcoded in ${formatMsDuration(duration)}. ${formatMb(pendingJob.originalFileSize)} -> ${formatMb(outputSize)}`
      );
    } catch (error) {
      this.error(`Error processing job ${pendingJob.id}:`, error);
      await db
        .update(jobs)
        .set({ status: "failed" })
        .where(eq(jobs.id, pendingJob.id));
    }
  }

  private async getFileSize(filePath: string): Promise<number> {
    const stats = await stat(filePath);
    return stats.size;
  }

  private async processVideo(
    jobId: string,
    inputPath: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-i",
        inputPath,
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "23",
        "-vf",
        "scale='if(gt(iw,1920),1920,iw)':-2",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        outputPath,
      ]);

      ffmpeg.on("close", async (code) => {
        if (code === 0) {
          await unlink(inputPath);
          resolve();
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });

      ffmpeg.on("error", (err) => {
        reject(err);
      });
    });
  }
}
