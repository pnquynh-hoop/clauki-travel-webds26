-- sites.sql - kho site khách của trình tạo web /tao (#81, js/site/sites.js): bảng sites trên Supabase.
-- Xuất bản xong là cố định: ai cũng thêm và đọc được, không ai sửa hay xoá, trừ máy demo (khoá riêng, không nằm trong repo).
-- Rào nội dung ở database: tên đúng dạng và không trùng tên dành riêng, mọi địa chỉ phải thuộc danh sách cho phép, JSON dưới 400 KB
-- (site dựng trên khung SighGone có danh mục tour và ảnh Wikimedia đã gần 200 KB).
-- Dán toàn bộ vào SQL Editor của Supabase rồi bấm Run. Chạy lại được nhiều lần (xoá bảng cũ, kể cả dữ liệu).
-- Đã có dữ liệu mà chỉ cần đổi luật nội dung: chạy riêng ba khối create or replace function url_ok, logo_ok, site_ok bên dưới
-- cùng câu grant execute, không chạy cả file.
-- Khoá demo KHÔNG nằm trong file này: chạy riêng câu insert ở cuối file, thay <KHOÁ DEMO> bằng khoá thật.

drop view  if exists public_sites;
drop table if exists sites;
drop table if exists cau_hinh_rieng;

create table sites (
  slug           text primary key
                 check (slug ~ '^[a-z0-9-]{3,30}$')
                 check (slug <> all (array['www','clauki','timider','api','admin','mail',
                                            'bac-tra','ganh-som','me-rach','brand-test','sighgone',
                                            'nhap','tao','sua','s','css','js','brands','components','docs','supabase','editor'])),
  content        jsonb not null,
  theme          jsonb not null default '{}',
  hidden         boolean not null default false,
  -- Tên tác giả nhập khi xuất bản (ghi nhận, hỗ trợ, thống kê). Không cấp quyền đọc cho khách nên không lộ qua API công khai.
  author         text check (author is null or char_length(btrim(author)) between 2 and 80),
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- Bảng riêng giữ mã băm của khoá máy demo. Không policy, không cấp quyền: khách không đọc được.
create table cau_hinh_rieng (
  ten     text primary key,
  gia_tri text not null
);
alter table cau_hinh_rieng enable row level security;
revoke all on cau_hinh_rieng from anon, authenticated;

-- Header x-demo-key có khớp khoá máy demo không.
-- security definer: hàm đọc được cau_hinh_rieng dù anon không có quyền.
create or replace function may_demo() returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (
    select 1 from cau_hinh_rieng
    where ten = 'demo_key_hash'
      and gia_tri = encode(digest(
            coalesce(current_setting('request.headers', true)::json ->> 'x-demo-key', ''),
            'sha256'), 'hex')
  );
$$;

-- Một chuỗi trông giống địa chỉ phải thuộc danh sách cho phép.
create or replace function url_ok(v text) returns boolean
language sql immutable as $$
  select v !~* '^\s*(https?:|//|data:|javascript:|vbscript:)'
      or v ~ '^https://(images\.unsplash\.com|images\.pexels\.com|upload\.wikimedia\.org|thumb\.wikimedia\.org|commons\.wikimedia\.org|www\.pexels\.com|unsplash\.com/photos|clauki\.xachbalo\.com/brands|zalo\.me|maps\.google\.com|www\.google\.com/maps)/';
$$;

-- Logo, logo nền tối, favicon: thêm được ảnh nhúng PNG, JPEG, WebP (editor thu nhỏ trên máy), dưới 60.000 ký tự; không nhận SVG.
create or replace function logo_ok(v text) returns boolean
language sql immutable as $$
  select v is null or url_ok(v)
      or (v ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' and length(v) < 60000);
$$;

-- JSON dưới 400 KB; mọi chuỗi qua url_ok, riêng ba trường logo qua logo_ok.
create or replace function site_ok(c jsonb) returns boolean
language sql immutable as $$
  select pg_column_size(c) < 400000
     and logo_ok(c #>> '{brand,logo}') and logo_ok(c #>> '{brand,logoDark}') and logo_ok(c #>> '{meta,favicon}')
     and not exists (
       select 1
       from jsonb_path_query(c #- '{brand,logo}' #- '{brand,logoDark}' #- '{meta,favicon}', 'strict $.** ? (@.type() == "string")') s(v)
       where not url_ok(v #>> '{}')
     );
$$;

alter table sites add constraint content_ok check (site_ok(content));

alter table sites enable row level security;

-- Ai cũng tạo trang mới được, nhưng phải ghi tên tác giả (site cũ trước khi có cột này thì để trống, vẫn sửa được bằng máy demo).
create policy tao_moi on sites for insert with check (author is not null and char_length(btrim(author)) >= 2);
-- UPDATE kèm WHERE cần thấy được dòng, nên phải có policy select.
create policy xem     on sites for select using (not hidden);
-- Chỉ máy demo sửa được. Không có policy delete: không ai xoá được.
create policy sua     on sites for update using (may_demo()) with check (may_demo());

-- Quyền theo cột: khách chỉ thêm và đọc; cột update chỉ có tác dụng khi qua được policy sua.
revoke all on sites from anon, authenticated;
grant insert (slug, content, theme, author)     on sites to anon;
grant select (slug, content, theme, hidden)     on sites to anon;
grant update (content, theme, updated_at)       on sites to anon;

grant usage on schema public to anon;
grant execute on function may_demo(), site_ok(jsonb), url_ok(text), logo_ok(text) to anon;

create view public_sites as
  select slug, content, theme from sites where not hidden;
grant select on public_sites to anon;

-- Chạy RIÊNG câu này, thay <KHOÁ DEMO> bằng khoá thật, không lưu lại khoá ở đâu ngoài trình quản lý mật khẩu:
-- insert into cau_hinh_rieng values ('demo_key_hash', encode(extensions.digest('<KHOÁ DEMO>', 'sha256'), 'hex'));

-- Bảng đã có dữ liệu, chỉ thêm tác giả (chạy riêng khối này, không chạy cả file vì cả file xoá bảng cũ):
-- alter table sites add column if not exists author text check (author is null or char_length(btrim(author)) between 2 and 80);
-- drop policy if exists tao_moi on sites;
-- create policy tao_moi on sites for insert with check (author is not null and char_length(btrim(author)) >= 2);
-- grant insert (author) on sites to anon;
