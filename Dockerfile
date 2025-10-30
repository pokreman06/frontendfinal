# https://hub.docker.com/_/microsoft-dotnet
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /AgentApi

ENV DOTNET_NOLOGO=true
ENV NUGET_PACKAGES=/root/.nuget/packages
ENV DOTNET_DISABLE_FALLBACK_PACKAGES=true
# copy csproj and restore as distinct layers
COPY *.sln .
COPY AgentApi/*.csproj ./AgentApi/
RUN dotnet restore

# copy everything else and build app
COPY AgentApi/. ./AgentApi/
RUN dotnet publish -c release -o /app

# final stage/image
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app ./
ENTRYPOINT ["dotnet", "AgentApi.dll"]