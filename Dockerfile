FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

WORKDIR /app

# Install dependencies as root
COPY package*.json ./
RUN npm ci

# Copy application files
COPY . .
ARG NEXT_PUBLIC_ORY_KRATOS_PUBLIC_URL
ENV NEXT_PUBLIC_ORY_KRATOS_PUBLIC_URL=$NEXT_PUBLIC_ORY_KRATOS_PUBLIC_URL
RUN npm run build
COPY public public
COPY next.config.ts ./

# Change ownership to non-root user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

EXPOSE 3000
CMD ["npm", "start"]
