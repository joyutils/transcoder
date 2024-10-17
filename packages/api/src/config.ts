import { mkdir } from "node:fs/promises";
import path from "node:path";

export const MAIN_UPLOADS_DIR = path.join(process.cwd(), "uploads");
export const PENDING_PROCESSING_DIR = path.join(
  MAIN_UPLOADS_DIR,
  "pending-processing"
);
export const PENDING_UPLOAD_DIR = path.join(MAIN_UPLOADS_DIR, "pending-upload");

await mkdir(PENDING_PROCESSING_DIR, { recursive: true });
await mkdir(PENDING_UPLOAD_DIR, { recursive: true });

export const CHAIN_HTTP_RPC_URL = "https://rpc.joyutils.org/http";

const RAW_TRANSACTOR_MEMBER_ID = process.env.TRANSACTOR_MEMBER_ID;
if (!RAW_TRANSACTOR_MEMBER_ID) {
  throw new Error("TRANSACTOR_MEMBER_ID is not set");
}
export const TRANSACTOR_MEMBER_ID = parseInt(RAW_TRANSACTOR_MEMBER_ID);
if (isNaN(TRANSACTOR_MEMBER_ID)) {
  throw new Error("TRANSACTOR_MEMBER_ID is not a number");
}

export const TRANSACTOR_ACCOUNT_MNEMONIC = process.env
  .TRANSACTOR_ACCOUNT_MNEMONIC as string;
if (!TRANSACTOR_ACCOUNT_MNEMONIC) {
  throw new Error("TRANSACTOR_ACCOUNT_MNEMONIC is not set");
}
