FROM node:20-slim

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use install instead of ci for flexibility)
RUN npm install --omit=dev

# Copy source code
COPY src/ ./src/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Start the application
CMD ["node", "src/server.js"]
