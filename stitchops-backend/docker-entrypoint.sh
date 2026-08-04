#!/bin/sh
set -eu

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting StitchOps backend..."
exec npm run start
