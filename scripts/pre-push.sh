#!/bin/bash
SCRIPT_PATH="$(dirname "${BASH_SOURCE[0]}")"

set -e

yarn
yarn codegen
yarn build
yarn build:examples
yarn lint
yarn run pack