# Build a small image for the Lovely Countdown app
FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Only install dependencies first for better caching
COPY package.json package-lock.json* ./
RUN npm install --production --no-audit --no-fund && npm cache clean --force

# Copy source
COPY server.js ./
COPY views ./views
COPY public ./public
COPY data ./data

EXPOSE 3000
CMD ["node", "server.js"]

