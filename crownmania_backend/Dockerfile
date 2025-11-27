FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application and config files
COPY dist/ ./dist/
COPY .env* ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Create an entry point file that requires the built server
RUN echo "import './dist/server.js';" > index.js

# Expose the port the app runs on
EXPOSE 8080

# Start the application
CMD ["node", "index.js"]
