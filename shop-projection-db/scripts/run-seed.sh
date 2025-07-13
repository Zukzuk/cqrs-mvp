#!/usr/bin/env bash
set -e

echo "🟡 [initdb] running projection‐seeder…"
/opt/seeder/node_modules/.bin/ts-node /opt/seeder/scr/seed.ts
echo "✅ [initdb] projection‐seeder done"
