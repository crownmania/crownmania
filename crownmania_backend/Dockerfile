FROM node:20-slim

# Force rebuild - updated Jan 7 2026

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use install instead of ci for flexibility)
# Using --legacy-peer-deps to resolve ethers v5/v6 conflict between thirdweb and typechain
RUN npm install --omit=dev --legacy-peer-deps

# Copy source code
COPY src/ ./src/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Start the application
CMD ["node", "src/server.js"]
