# Sudoku — React + Vite

เกมซูโดกุ 3 ระดับความยาก พร้อมระบบช่วยเหลือผู้เล่น และ **ตรวจสอบทุกกระดานที่สร้างขึ้น** ว่าแก้จบได้ถูกต้อง (คำตอบเดียว) — ข้อมูลทั้งหมดเก็บใน `localStorage` ไม่มี backend

```bash
npm install
npm run dev        # โอเพน http://localhost:5173
npm run build      # production build → dist/
npm run preview    # เสิร์ฟ dist/
npm run verify     # รันชุดทดสอบ engine (generator + solver + hint)
```

## Docker

```bash
docker compose up -d --build     # → http://localhost:8080
docker compose logs -f sudoku-web
docker compose down

# เปลี่ยนพอร์ตฝั่ง host
WEB_PORT=9090 docker compose up -d
```

- **Multi-stage build**: `node:22-alpine` (npm ci + `tsc -b` + `vite build`) → `nginxinc/nginx-unprivileged:1.27-alpine` (uid 101 ไม่ใช่ root) — image สุดท้าย ~74 MB, ไม่มี Node/node_modules
- **ไม่มี DB / ไม่มี API** — เป็น static SPA ล้วน ทุกอย่างอยู่ใน localStorage ของเบราว์เซอร์ผู้เล่น
- **nginx**: gzip, cache 1 ปีสำหรับ `/assets/*` (hash ในชื่อไฟล์), `no-cache` สำหรับ `index.html`, SPA fallback, security headers + CSP, ซ่อน dotfiles (403), `/healthz`
- **hardening**: `read_only: true` (tmpfs เฉพาะ `/var/cache/nginx`, `/var/run`, `/tmp`), `no-new-privileges`, healthcheck ทุก 30 วิ
- **ไม่ต้องมี env/secret ใด ๆ** — ถ้าจะเปลี่ยนพอร์ตให้ใช้ `WEB_PORT` (ค่าเริ่มต้น 8080)

```bash
# หรือรันแบบไม่ใช้ compose
docker build -t sudoku-game:1.0.0 .
docker run -d --name sudoku-web -p 8080:8080 --read-only \
  --tmpfs /var/cache/nginx --tmpfs /var/run --tmpfs /tmp \
  --security-opt no-new-privileges sudoku-game:1.0.0
```

## ฟีเจอร์

- **3 ระดับ**: ง่าย (41–47 เลขตั้งต้น, ใช้ Singles เท่านั้น) · ปานกลาง (33–39) · ยาก (26–31, อาจต้องลอง)
- **ระบบช่วยเหลือ**
  - คำใบ้แบบ **สอนเทคนิค**: Naked Single, Hidden Single, Locked Candidates, Naked/Hidden Pair, X-Wing พร้อมคำอธิบายภาษาไทยและไฮไลต์ช่อง
  - ถ้า logic ตันทุกทาง → เฉลยช่องที่แคบที่สุด (Guess)
  - ตรวจกระดาน (ไฮไลต์ช่องที่ผิด), เฉลยช่องที่เลือก, โหมดจดโน้ต, ย้อนกลับ (undo), ไฮไลต์แถว/คอลัมน์/เลขเดียวกัน
- **ตรวจสอบทุกกระดาน**: ทุก puzzle ถูก verify ก่อนส่งให้ผู้เล่น (unique solution + เฉลย valid + givens ตรงกับเฉลย + แก้จาก givens ไปเฉลยได้จริง)
- **localStorage**: เกมที่ค้างไว้ ( resume ได้หลังรีเฟรช), สถิติแยกตามระดับ (เวลาดีที่สุด, จำนวนที่เล่น/แก้สำเร็จ), การตั้งค่า
- คีย์บอร์ด: ลูกศรเลื่อน · 1–9 ใส่เลข · Backspace ลบ · N โน้ต · H คำใบ้ · U ย้อนกลับ · P หยุด

## โครงสร้าง

```
Dockerfile            # multi-stage: node build → nginx (unprivileged) serve
nginx/default.conf    # gzip, cache, SPA fallback, security headers, /healthz
docker-compose.yml    # service เดียว พอร์ต 8080 + healthcheck
src/lib/sudoku.ts     # engine: bitmask solver, generator, uniqueness, rating, verification
src/lib/hints.ts      # hint engine + ข้อความอธิบายภาษาไทย (sanitize กับเฉลยทุกครั้ง)
src/lib/storage.ts    # localStorage schema + validation ตอนโหลด
src/hooks/useGame.ts  # game state (reducer), timer, persistence
src/components/       # Board, NumberPad, Toolbar, HintCard, SidePanel, WinDialog, TopBar
scripts/verify.ts     # ชุดทดสอบ engine (ดูหัวข้อ "การตรวจสอบ")
```

## อัลกอริทึม

1. **สร้างเฉลย**: backtracking แบบสุ่มบนกระดานว่าง (MRV — เลือกช่องที่มี candidate น้อยที่สุดก่อน)
2. **ขุดช่อง**: สลับลำดับคู่สมมาตร 180° แล้วค่อย ๆ เอาออก โดยเช็คทุกครั้งว่า `countSolutions(givens, 2) === 1`
   - ระดับง่าย/กลาง บังคับเพิ่มว่าเทคนิคที่ต้องใช้ต้องไม่เกินระดับที่กำหนด (rate ด้วย logic solver)
3. **ให้คะแนนความยาก**: logic solver ไล่เทคนิคจากง่ายไปยาก นับระดับสูงสุดที่ต้องใช้ (1 = Singles, 2 = Locked/Pairs, 3 = X-Wing, 4 = ต้องเดา)
4. **คำใบ้**: หา logical step ถัดไปจากกระดานจริง แล้ว **เทียบกับเฉลยก่อนแสดงผล** — ถ้า logic คลาดเคลื่อนจะไม่แนะนำเลขผิดออกไป

## การตรวจสอบ (`npm run verify`)

รัน 20 กระดานต่อระดับ (60 กระดาน) แล้วตรวจ:

- `countSolutions === 1` ทุกกระดาน (คำตอบเดียว)
- `solveFirst(givens)` ได้เฉลยตรงกับ solution
- เฉลย valid ตามกติกา 9×9 และ givens ไม่ขัดกับเฉลย
- จำนวน clue และระดับเทคนิคอยู่ในช่วงของระดับนั้น
- **เล่นจบทุกกระดานด้วยคำใบ้** โดยไม่มีการแนะนำเลขผิดเลย (0 ครั้ง)
- ทดสอบ mid-game 720 สถานะ + walkthrough 2,640 ก้าวของ logic — ทุกก้าวถูกต้อง

## localStorage keys

| key | เก็บอะไร |
|---|---|
| `sudoku.v1.game` | puzzle + ค่าที่กรอก + โน้ต + เวลา + จำนวนคำใบ้/เลขผิด |
| `sudoku.v1.stats` | สถิติแยกตามระดับ + 12 เกมล่าสุด |
| `sudoku.v1.settings` | การตั้งค่าไฮไลต์/โน้ตอัตโนมัติ |

ตอนโหลดเกมจะ re-verify puzzle ทุกครั้ง ถ้าข้อมูลเสียหรือถูกแก้จะไม่ถูกโหลด (เริ่มเกมใหม่แทน)
