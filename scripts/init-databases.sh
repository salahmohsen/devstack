#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE mastra_agent;
    GRANT ALL PRIVILEGES ON DATABASE mastra_agent TO $POSTGRES_USER;
EOSQL
