FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_ORY_KRATOS_PUBLIC_URL
ENV NEXT_PUBLIC_ORY_KRATOS_PUBLIC_URL=$NEXT_PUBLIC_ORY_KRATOS_PUBLIC_URL
RUN npm run build
COPY public public
COPY next.config.ts ./
EXPOSE 3000
CMD ["npm", "start"]
