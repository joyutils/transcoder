import { db } from "./db";
import { jobs, type DbJob, type JobStatus } from "./db/schema";
import { eq } from "drizzle-orm";

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

  protected async getNextJob(status: JobStatus) {
    return await db.query.jobs.findFirst({
      where: eq(jobs.status, status),
      orderBy: (jobs, { asc }) => [asc(jobs.createdAt)],
      with: {
        video: true,
      },
    });
  }

  protected log(message: string): void {
    console.log(`[${this.name} worker] ${message}`);
  }

  protected error(message: string, error?: unknown): void {
    console.error(`[${this.name}] ${message}`, error);
  }
}
