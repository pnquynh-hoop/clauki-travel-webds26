"""serve.py - chạy thử trên máy: có file thì trả file, không có thì trả index.html (giống Cloudflare Pages),
để các địa chỉ như /ganh-som/phong mở được. Chỉ dùng trên máy, không deploy, không phải backend của trang.

Chạy trong thư mục dự án:  python3 serve.py        (cổng 5500)
                           python3 serve.py 8000   (cổng khác)
"""
import http.server
import os
import sys
from urllib.parse import urlsplit, unquote

ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_head(self):
        path = unquote(urlsplit(self.path).path)
        # Đường dẫn không có đuôi file (/ganh-som/phong) và không trỏ tới file hay thư mục có thật là một trang:
        # trả index.html để core.js đọc đường dẫn. File thiếu thật (ảnh, css) vẫn báo 404 như bình thường.
        if '.' not in os.path.basename(path) and not os.path.exists(self.translate_path(self.path)):
            self.path = '/index.html'
        return super().send_head()

    # Không có header này thì trình duyệt tự giữ bản cũ của brands.json, content.json một lúc:
    # thêm thương hiệu mới mà trình duyệt chưa thấy thì địa chỉ /<id-mới>/ bị đổi về thương hiệu đã lưu.
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
    print(f'Mở http://localhost:{port}  (Ctrl+C để dừng)')
    http.server.ThreadingHTTPServer(('', port), Handler).serve_forever()
