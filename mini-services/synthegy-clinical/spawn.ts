#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import { resolve } from "node:path";
const SERVICE_DIR = resolve(import.meta.dir);
const LOG_PATH = "/tmp/synthegy-clinical.log";
const logFd = openSync(LOG_PATH, "a");
const child = spawn("bun", ["index.ts"], { cwd: SERVICE_DIR, stdio: ["ignore", logFd, logFd], detached: true, env: { ...process.env } });
child.unref();
console.log(`[spawn-clinical] launched PID ${child.pid}, log: ${LOG_PATH}`);
process.exit(0);
