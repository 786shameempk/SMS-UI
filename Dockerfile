# Build Stage
FROM node:22-alpine AS build

WORKDIR /src

COPY package*.json ./

# npm install, not npm ci: the lockfile is generated on Windows and misses the Linux-only optional
# native/wasm deps, which npm ci rejects as "out of sync".
RUN npm install

COPY . .

# Vite bakes these into the bundle at build time, and the browser calls them directly, so they must
# be URLs reachable from the user's machine (the host-mapped ports), not Docker service names.
# Process env takes precedence over the committed .env file.
ARG VITE_AUTH_API_URL=http://localhost:5118/
ARG VITE_ACADEMIC_API_URL=http://localhost:5136/
ARG VITE_FINANCE_API_URL=http://localhost:5137/
ARG VITE_CAMPUS_API_URL=http://localhost:5139/
ARG VITE_ENGAGEMENT_API_URL=http://localhost:5140/
ENV VITE_AUTH_API_URL=$VITE_AUTH_API_URL \
    VITE_ACADEMIC_API_URL=$VITE_ACADEMIC_API_URL \
    VITE_FINANCE_API_URL=$VITE_FINANCE_API_URL \
    VITE_CAMPUS_API_URL=$VITE_CAMPUS_API_URL \
    VITE_ENGAGEMENT_API_URL=$VITE_ENGAGEMENT_API_URL

RUN npm run build

# Production Stage
FROM nginx:alpine

COPY --from=build /src/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
