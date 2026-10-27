FROM node:20-alpine

WORKDIR /app

ARG DATABASE_URL=postgresql://stitchops:stitchops@db:5432/stitchops?sslmode=disable
ARG DIRECT_DATABASE_URL=postgresql://stitchops:stitchops@db:5432/stitchops?sslmode=disable
ENV DATABASE_URL=$DATABASE_URL
ENV DIRECT_DATABASE_URL=$DIRECT_DATABASE_URL

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# Strip Windows line endings — a CRLF shebang makes the container fail to start.
RUN tr -d '\015' < /usr/local/bin/docker-entrypoint.sh > /tmp/ep.sh && mv /tmp/ep.sh /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["docker-entrypoint.sh"]
