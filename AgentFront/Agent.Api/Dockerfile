# -------------------------
# Stage 1: Build frontend
# -------------------------
FROM node:20-slim AS build

# Set working directory
WORKDIR /app

# Install PNPM
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Copy only package files first (for caching)
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build the Vite app
RUN pnpm run build

# -------------------------
# Stage 2: Serve with Nginx
# -------------------------
FROM nginx:alpine AS final

# Remove default Nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend from the previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
