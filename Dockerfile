# ---------- Base builder ----------
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat python3 make g++

RUN corepack enable && corepack prepare pnpm@9 --activate

# Build-time variables
ARG GOOGLE_API_KEY
ARG NEXT_PUBLIC_API_URL

ENV GOOGLE_API_KEY=$GOOGLE_API_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY pnpm-lock.yaml package.json ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build


# ---------- Production runtime ----------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=80

RUN apk add --no-cache libc6-compat

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY pnpm-lock.yaml package.json ./

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.* ./

EXPOSE 80

CMD ["pnpm", "next", "start", "-p", "80"]