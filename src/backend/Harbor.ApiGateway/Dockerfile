FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY src/shared/Harbor.Contracts/ src/shared/Harbor.Contracts/
COPY src/shared/Harbor.Common/ src/shared/Harbor.Common/
COPY src/shared/Harbor.Caching/ src/shared/Harbor.Caching/
COPY src/backend/Harbor.ApiGateway/ src/backend/Harbor.ApiGateway/

RUN --mount=type=cache,id=nuget,target=/root/.nuget/packages,sharing=locked \
    dotnet publish "src/backend/Harbor.ApiGateway/Harbor.ApiGateway.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Harbor.ApiGateway.dll"]
