
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

# Build arguments for OIDC configuration (optional, will use defaults if not provided)
ARG VITE_OIDC_AUTHORITY
ARG VITE_OIDC_CLIENT_ID
ARG VITE_OIDC_REDIRECT_URI
ARG VITE_OIDC_POST_LOGOUT_REDIRECT_URI
ARG VITE_OIDC_RESPONSE_TYPE
ARG VITE_OIDC_SCOPE
ARG VITE_API_URL

# Expose Vite env vars for build step
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_OIDC_AUTHORITY=${VITE_OIDC_AUTHORITY}
ENV VITE_OIDC_CLIENT_ID=${VITE_OIDC_CLIENT_ID}
ENV VITE_OIDC_REDIRECT_URI=${VITE_OIDC_REDIRECT_URI}
ENV VITE_OIDC_POST_LOGOUT_REDIRECT_URI=${VITE_OIDC_POST_LOGOUT_REDIRECT_URI}
ENV VITE_OIDC_RESPONSE_TYPE=${VITE_OIDC_RESPONSE_TYPE}
ENV VITE_OIDC_SCOPE=${VITE_OIDC_SCOPE}

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

# Copy custom Nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]