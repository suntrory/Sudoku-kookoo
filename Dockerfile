# syntax=docker/dockerfile:1

# ------------------------------------------------------------------
# Stage 1 — build (Node) : compile TypeScript + Vite bundle
# ------------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

# คัดลอก manifest ก่อนเพื่อให้ layer ของ dependency ถูก cache
COPY package.json package-lock.json ./
RUN npm ci

# คัดลอกซอร์สที่ใช้ build (ไม่รวม node_modules/dist เพราะมี .dockerignore)
COPY . .

# .env ถูก .dockerignore ตัดออก → รับค่า GA ผ่าน build arg แทน (Vite ฝังค่าลง bundle ตอน build)
ARG VITE_GA_MEASUREMENT_ID
ENV VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID

# tsc -b (typecheck) && vite build → /app/dist
RUN npm run build

# ------------------------------------------------------------------
# Stage 2 — runtime (Nginx) : เสิร์ฟ static files เท่านั้น
# ไม่มี Node ไม่มี node_modules ใน image สุดท้าย
# ------------------------------------------------------------------
# ใช้ image unprivileged (รันเป็น uid 101 ไม่ใช่ root) ฟังพอร์ต 8080
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

LABEL org.opencontainers.image.title="sudoku-game" \
      org.opencontainers.image.description="Sudoku 3 ระดับ พร้อมระบบคำใบ้ — React + Vite (static SPA)" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.licenses="MIT"

# config: gzip, cache-control, security headers, /healthz
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
