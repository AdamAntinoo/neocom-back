# Runtime image for staging/prod Docker engine deploy (CICD-B-082 / B-083).
# Build context: repository root after `npm run build` (dist present).
FROM node:24.21.0-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json package-lock.json ./
# prepare runs `git config core.hooksPath` — no git in alpine runtime image.
RUN npm ci --omit=dev --ignore-scripts
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
