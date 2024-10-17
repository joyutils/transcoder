// set all jobs to pending
import { db } from "./src/db";
import { jobs } from "./src/db/schema";

await db.update(jobs).set({ status: "pending_processing" });
