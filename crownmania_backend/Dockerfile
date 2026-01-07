FROM node:20-slim

# Force rebuild - updated Jan 7 2026

# Create app directory
WORKDIR /app

# Copy package files and npm config
COPY package*.json ./
COPY .npmrc ./

# Install dependencies (use install instead of ci for flexibility)
# legacy-peer-deps is set in .npmrc to resolve ethers v5/v6 conflict
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
