#!/usr/bin/env bash
set -e

docker compose -f docker/docker-compose.yml --env-file .env.dev up db smtp -d

exec dotenv -e .env.dev -- vite dev
