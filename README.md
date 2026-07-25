Để chạy ứng dụng này trên máy chủ Ubuntu tại thư mục /root/Render/, bạn có thể thực hiện theo các bước chi tiết sau đây:
1. Xuất mã nguồn từ AI Studio
Trước tiên, bạn cần lấy mã nguồn ra khỏi môi trường AI Studio:
Nhấn vào biểu tượng Settings (bánh răng) ở góc trên bên phải.
Chọn Export to GitHub (để sync qua repo) hoặc Download ZIP để tải về máy cá nhân, sau đó upload lên máy chủ Ubuntu.
2. Chuẩn bị môi trường trên Ubuntu
Mở terminal trên Ubuntu và cài đặt Node.js (phiên bản 18 hoặc 20 trở lên):
code
Bash
# Cập nhật hệ thống
sudo apt update
sudo apt install -y curl git

# Cài đặt Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
3. Cài đặt ứng dụng vào /root/Render/
Giả sử bạn đã upload file ZIP lên máy chủ, hãy giải nén vào thư mục đích:
code
Bash
# Tạo thư mục
mkdir -p /root/Render/
cd /root/Render/

# Nếu bạn dùng Git để tải về:
# git clone <URL_REPO_CỦA_BẠN> .

# Nếu bạn giải nén ZIP (giả sử file là app.zip):
# apt install unzip
# unzip app.zip -d /root/Render/
4. Cấu hình biến môi trường
Ứng dụng cần API Key để chạy các tính năng AI. Bạn cần tạo file .env:
code
Bash
# Tạo file .env
nano .env
Dán nội dung sau vào và thay YOUR_GEMINI_API_KEY bằng key của bạn:
code
Env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
(Nhấn Ctrl + O, Enter để lưu và Ctrl + X để thoát)
5. Cài đặt thư viện và khởi chạy
Bây giờ hãy cài đặt các gói phụ thuộc và bắt đầu chạy:
code
Bash
# Cài đặt dependencies
npm install

# Build ứng dụng cho môi trường production
npm run build

# Chạy server (Vite mặc định dùng port 3000)
npm run dev -- --host 0.0.0.0
6. Chạy ngầm định (Khuyên dùng cho Server)
Để ứng dụng không bị tắt khi bạn đóng terminal, hãy dùng PM2:
code
Bash
# Cài đặt PM2
sudo npm install -g pm2

# Chạy ứng dụng với PM2
pm2 start npm --name "renderspeed-ai" -- run dev -- --host 0.0.0.0

# Kiểm tra trạng thái
pm2 status
Lưu ý quan trọng:
Mở Port: Hãy đảm bảo firewall của Ubuntu đã mở port 3000 (hoặc port bạn cấu hình trong vite.config.ts).
Bảo mật: File package.json hiện tại đang sử dụng Vite cho cả phần hiển thị và gọi API (client-side). Bạn nên cấu hình Nginx làm Proxy ngược nếu muốn chạy chuyên nghiệp và bảo mật hơn.
Mã nguồn mới: Tính năng "Phác thảo / Mặt đứng ý tưởng" tôi vừa thêm cho bạn đã sẵn sàng trong mã nguồn này, bạn chỉ cần thực hiện các bước trên là có thể dùng ngay trên server riêng.
