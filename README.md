# Render AI - Ứng dụng tạo ảnh AI

## Yêu cầu hệ thống
- Node.js >= 18
- pnpm (npm install -g pnpm)

## Cài đặt & Chạy

```bash
# 1. Cài dependencies
pnpm install --ignore-scripts
pnpm approve-builds  # chọn esbuild + javascript-obfuscator
pnpm install

# 2. Tạo file .env (copy từ .env.example)
cp .env.example .env
# Sau đó mở .env và điền GEMINI_API_KEY của bạn

# 3. Build
pnpm build

# 4. Chạy development server
pnpm dev
```

## API Key

App cần Gemini API Key từ Google AI Studio:
1. Truy cập https://aistudio.google.com/apikey
2. Đăng nhập Google Account
3. Click "Create API Key" → chọn "Free tier" (miễn phí, có giới hạn)
4. Copy key và dán vào file `.env`

```env
GEMINI_API_KEY=key_của_bạn
```

## Cấu trúc thư mục
```
RenderAi/
├── src/            # Mã nguồn chính
├── dist/           # Build output (sau khi chạy pnpm build)
├── components/     # Components
├── public/         # Static assets
├── .env.example    # Mẫu cấu hình môi trường
└── index.html      # Entry point
```

## Triển khai (Production)

App được serve qua nginx tại `render.nasxpen.top`:
- Port local: 8100
- Nginx root: `/root/RenderAi/dist`
- Cloudflare tunnel ingress sẵn
