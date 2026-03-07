# Stage 1: Build React client
FROM node:20-alpine AS client-build
WORKDIR /app/client
ENV NODE_ENV=development
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine
WORKDIR /app

# Install server dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server source files
COPY server.js .
COPY database.js .
COPY middleware/ ./middleware/
COPY routes/ ./routes/

# Copy built React app from stage 1
COPY --from=client-build /app/client/dist ./client/dist

# Ensure uploads directory exists
RUN mkdir -p uploads/ids

EXPOSE 3100
ENV NODE_ENV=production

CMD ["node", "server.js"]
