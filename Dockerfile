FROM node:16-alpine

# Create build folder
WORKDIR /app

# Install deps
COPY package.json .
COPY yarn.lock .
RUN yarn install

# Stupid client-server structure, not my fault. Client's package needs full src to build lmao
COPY client/ ./client/
RUN yarn run build

COPY . .
EXPOSE 4004
CMD yarn run client