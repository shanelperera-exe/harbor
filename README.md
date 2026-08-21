# Harbor MVP

## What Harbor is
Harbor is a deployment and environment management platform.

## Architecture overview
The platform consists of a React frontend and multiple ASP.NET Core microservices (API Gateway, Authentication, Project, Environment, Deployment, Reporting) backed by MySQL and Kafka.

## Repository structure
- `src/frontend`: React web application
- `src/backend`: ASP.NET Core microservices
- `src/shared`: Shared libraries
- `infrastructure`: Docker, Kafka, Monitoring, and Database configurations
- `docs`: Architecture and API documentation

## Technology stack
- Frontend: React (Vite)
- Backend: ASP.NET Core 8, C#, ADO.NET
- Database: MySQL
- Messaging: Apache Kafka
- Containerization: Docker

## Local development prerequisites
- .NET 8 SDK
- Node.js & npm
- Docker Desktop
- MySQL

## Basic startup instructions
1. Run `docker-compose -f infrastructure/docker-compose/docker-compose.dev.yml up -d`
2. Run `dotnet restore` and `dotnet build`
3. cd into `src/frontend/harbor-web` and run `npm install` then `npm run dev`
