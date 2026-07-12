#!/bin/bash
# Start the Synthegy backend service detached.
cd /home/z/my-project/mini-services/synthegy-backend
exec bun run dev > /tmp/synthegy-backend.log 2>&1
