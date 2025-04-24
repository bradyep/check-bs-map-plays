# Use Node.js 18 as the base image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and config files
COPY . .

# Build the TypeScript code and copy public assets
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Run the server
CMD ["npm", "run", "server"]