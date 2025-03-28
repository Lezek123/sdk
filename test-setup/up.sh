#!/bin/bash
SCRIPT_PATH="$(dirname "${BASH_SOURCE[0]}")"

cd $SCRIPT_PATH

docker compose down -v

# Setup Orion mock
docker compose up -d mock-orion_db
docker compose run --rm mock-orion_graphql-api npm run db:migrate
docker compose run --rm -v $(pwd)/orionData.json:/input/seedData.json mock-orion_graphql-api npm run db:seed /input/seedData.json

# Start all services
docker compose up -d