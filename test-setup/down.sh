#!/bin/bash
SCRIPT_PATH="$(dirname "${BASH_SOURCE[0]}")"

cd $SCRIPT_PATH

docker compose down -v