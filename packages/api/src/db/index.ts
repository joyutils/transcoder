import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema";
import { DB_PATH } from "../config";

const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite, { schema });
