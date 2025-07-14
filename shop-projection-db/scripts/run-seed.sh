#!/usr/bin/env bash
set -e

echo "[shop-projection-db] running projection‐seeder…"
node /opt/seeder/dist/seed.js
echo "[shop-projection-db] projection‐seeder done"
