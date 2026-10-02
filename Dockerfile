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
ARG VITE_MEETING_API_URL=http://localhost:5141/
ARG VITE_AI_API_URL=http://localhost:5142/
ENV VITE_AUTH_API_URL=$VITE_AUTH_API_URL \
    VITE_ACADEMIC_API_URL=$VITE_ACADEMIC_API_URL \
    VITE_FINANCE_API_URL=$VITE_FINANCE_API_URL \
    VITE_CAMPUS_API_URL=$VITE_CAMPUS_API_URL \
    VITE_ENGAGEMENT_API_URL=$VITE_ENGAGEMENT_API_URL \
    VITE_MEETING_API_URL=$VITE_MEETING_API_URL \
    VITE_AI_API_URL=$VITE_AI_API_URL

RUN npm run build

# Production Stage
FROM nginx:alpine

COPY --from=build /src/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Runtime API addresses: nginx runs /docker-entrypoint.d/*.sh at start, and this one rewrites config.js from
# AUTH_API_URL, ACADEMIC_API_URL, ... (see docker/40-educore-config.sh). CRLFs are stripped in case the
# checkout was made on Windows.
COPY docker/40-educore-config.sh /docker-entrypoint.d/40-educore-config.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-educore-config.sh && chmod +x /docker-entrypoint.d/40-educore-config.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
