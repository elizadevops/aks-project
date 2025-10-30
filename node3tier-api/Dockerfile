# syntax=docker/dockerfile:1

########### deps ###########
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

########### runner ###########
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# сначала node_modules (лучше кэшируется), потом исходники
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# безопасность: non-root
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp
USER nodeusr

EXPOSE 5000
# переменные окружения НЕ указываем — будут из ConfigMap/Secret
CMD ["npm", "start"]
