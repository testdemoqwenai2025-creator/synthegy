#!/bin/bash
# Start the Synthegy molecule microservice detached.
cd /home/z/my-project/mini-services/synthegy-molecule
exec bun run dev > /tmp/synthegy-molecule.log 2>&1
