FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore "src/backend/Harbor.ApiGateway/Harbor.ApiGateway.csproj"
RUN dotnet publish "src/backend/Harbor.ApiGateway/Harbor.ApiGateway.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Harbor.ApiGateway.dll"]
