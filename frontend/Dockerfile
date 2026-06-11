FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
RUN apk add --no-cache gettext
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf.template
EXPOSE 80
CMD ["/bin/sh", "-c", \
  "export USER_SERVICE_URL=${USER_SERVICE_URL:-http://localhost:8081}; \
   export CONTENT_SERVICE_URL=${CONTENT_SERVICE_URL:-http://localhost:8082}; \
   export RECOMMENDATION_SERVICE_URL=${RECOMMENDATION_SERVICE_URL:-http://localhost:8083}; \
   export GENAI_SERVICE_URL=${GENAI_SERVICE_URL:-http://localhost:8000}; \
   export MINIO_URL=${MINIO_URL:-http://localhost:9000}; \
   envsubst '${USER_SERVICE_URL} ${CONTENT_SERVICE_URL} ${RECOMMENDATION_SERVICE_URL} ${GENAI_SERVICE_URL} ${MINIO_URL}' \
     < /etc/nginx/conf.d/default.conf.template \
     > /etc/nginx/conf.d/default.conf && \
   nginx -g 'daemon off;'"]
