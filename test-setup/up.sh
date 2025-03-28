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

# Wait until processor is ready
timeout=120
interval=5
elapsed=0
echo "Waiting for processor to be ready"
while true; do
  if docker compose logs qn_processor 2>&1 | grep -q "Starting the event queue"; then
    echo "OK"
    break
  fi

  if [ $elapsed -ge $timeout ]; then
    echo "Timeout reached!"
    exit 1
  fi

  sleep $interval
  echo -n "."
  elapsed=$((elapsed + interval))
done

# Restart graphql server
docker compose restart qn_graphql-server