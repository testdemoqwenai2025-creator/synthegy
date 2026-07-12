#!/usr/bin/env bun
// Daemon spawner for synthegy-ord — double-fork detach.
import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import { resolve } from "node:path";

const SERVICE_DIR = resolve(import.meta.dir);
const LOG_PATH = "/tmp/synthegy-ord.log";
const logFd = openSync(LOG_PATH, "a");

const child = spawn("bun", ["index.ts"], {
  cwd: SERVICE_DIR,
  stdio: ["ignore", logFd, logFd],
  detached: true,
  env: { ...process.env },
});
child.unref();

console.log(`[spawn-ord] launched PID ${child.pid}, log: ${LOG_PATH}`);
process.exit(0);
