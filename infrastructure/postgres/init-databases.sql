-- Initialize isolated PostgreSQL databases for each Harbor microservice.
-- Executed automatically by the official postgres Docker image on first startup
-- when mounted into /docker-entrypoint-initdb.d/.

CREATE DATABASE harbor_auth;
CREATE DATABASE harbor_project;
CREATE DATABASE harbor_env;
CREATE DATABASE harbor_deploy;
CREATE DATABASE harbor_reporting;
