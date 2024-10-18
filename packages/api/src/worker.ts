import { db } from "./db";
import { jobs, type JobStatus } from "./db/schema";
import { and, lt, eq } from "drizzle-orm";

export abstract class Worker {
  protected name: string;
  protected interval: number;

  constructor(name: string, interval: number = 5000) {
    this.name = name;
    this.interval = interval;
  }

  async start(): Promise<void> {
    this.log("started");
    while (true) {
      await this.processNextJob();
      await new Promise((resolve) => setTimeout(resolve, this.interval));
    }
  }

  protected abstract processNextJob(): Promise<void>;

  protected async getNextJob(status: JobStatus, minDelaySeconds?: number) {
    let cutoffCondition = undefined;

    if (minDelaySeconds) {
      const cutoffDate = new Date(Date.now() - minDelaySeconds * 1000);
      const cutoffDateString = cutoffDate
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
      cutoffCondition = lt(jobs.updatedAt, cutoffDateString);
    }

    const job = await db.query.jobs.findFirst({
      where: and(eq(jobs.status, status), cutoffCondition),
      orderBy: jobs.createdAt,
      with: {
        video: true,
      },
    });

    return job;
  }

  protected log(message: string): void {
    console.log(`[${this.name} worker] ${message}`);
  }

  protected error(message: string, error?: unknown): void {
    console.error(`[${this.name} worker] ${message}`, error);
  }
}
