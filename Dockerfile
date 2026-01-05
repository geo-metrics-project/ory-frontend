FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
COPY public public
COPY next.config.ts ./
EXPOSE 3000
CMD ["npm", "start"]
