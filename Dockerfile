FROM node:22-alpine
WORKDIR /app
ARG API_INTERNAL_URL=http://api:4000/api
ENV API_INTERNAL_URL=$API_INTERNAL_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000 4000
CMD ["npm", "run", "start"]
