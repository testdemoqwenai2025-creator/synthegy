#!/usr/bin/env bun
// Daemon spawner — double-forks to fully detach from the parent shell,
// so the spawned service survives even when the bash tool exits.
//
// Usage: bun spawn-molecule.ts

import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import { resolve } from "node:path";

const SERVICE_DIR = resolve(import.meta.dir);
const LOG_PATH = "/tmp/synthegy-molecule.log";

// Open log file for append
const logFd = openSync(LOG_PATH, "a");

// First fork
const child = spawn("bun", ["index.ts"], {
  cwd: SERVICE_DIR,
  stdio: ["ignore", logFd, logFd],
  detached: true,    // critical — creates new session
  env: { ...process.env },
});

// When the spawner exits, the detached child keeps running.
child.unref();

console.log(`[spawn-molecule] launched PID ${child.pid}, log: ${LOG_PATH}`);
process.exit(0);
