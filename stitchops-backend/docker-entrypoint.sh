#!/bin/sh
set -u

# Retry instead of exiting: on a fresh boot or after a host restart the
# database can take a while to accept connections.
echo "Running Prisma migrations..."
attempt=1
until npx prisma migrate deploy; do
  if [ "$attempt" -ge 10 ]; then
    echo "Migrations still failing after $attempt attempts — starting the API anyway."
    break
  fi
  echo "Migration attempt $attempt failed — retrying in 5s..."
  attempt=$((attempt + 1))
  sleep 5
done

echo "Starting ElegantsDesign backend..."
exec npm run start
