-- sites.sql - kho site khách của trình tạo web /tao (#81, js/sites.js): bảng sites trên Supabase.
-- Xuất bản xong là cố định: ai cũng thêm và đọc được, không ai sửa hay xoá, trừ máy demo (khoá riêng, không nằm trong repo).
-- Rào nội dung ở database: tên đúng dạng và không trùng tên dành riêng, mọi địa chỉ phải thuộc danh sách cho phép, JSON dưới 400 KB
-- (site dựng trên khung SighGone có danh mục tour và ảnh Wikimedia đã gần 200 KB).
-- Dán toàn bộ vào SQL Editor của Supabase rồi bấm Run. Chạy lại được nhiều lần (xoá bảng cũ, kể cả dữ liệu).
-- Khoá demo KHÔNG nằm trong file này: chạy riêng câu insert ở cuối file, thay <KHOÁ DEMO> bằng khoá thật.

drop view  if exists public_sites;
drop table if exists sites;
drop table if exists cau_hinh_rieng;

create table sites (
  slug           text primary key
                 check (slug ~ '^[a-z0-9-]{3,30}$')
                 check (slug <> all (array['www','clauki','timider','api','admin','mail',
                                            'bac-tra','ganh-som','me-rach','brand-test','sighgone',
                                            'nhap','tao','sua','s','css','js','brands','docs','supabase','editor'])),
  content        jsonb not null,
  theme          jsonb not null default '{}',
  hidden         boolean not null default false,
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

-- Mọi chuỗi trông giống địa chỉ phải thuộc danh sách cho phép; JSON dưới 400 KB.
create or replace function site_ok(c jsonb) returns boolean
language sql immutable as $$
  select pg_column_size(c) < 400000
     and not exists (
       select 1
       from jsonb_path_query(c, 'strict $.** ? (@.type() == "string")') s(v)
       where (v #>> '{}') ~* '^\s*(https?:|//|data:|javascript:|vbscript:)'
         and (v #>> '{}') !~ '^https://(images\.unsplash\.com|images\.pexels\.com|upload\.wikimedia\.org|thumb\.wikimedia\.org|commons\.wikimedia\.org|www\.pexels\.com|clauki\.xachbalo\.com/brands|zalo\.me|maps\.google\.com|www\.google\.com/maps)/'
     );
$$;

alter table sites add constraint content_ok check (site_ok(content));

alter table sites enable row level security;

-- Ai cũng tạo trang mới được.
create policy tao_moi on sites for insert with check (true);
-- UPDATE kèm WHERE cần thấy được dòng, nên phải có policy select.
create policy xem     on sites for select using (not hidden);
-- Chỉ máy demo sửa được. Không có policy delete: không ai xoá được.
create policy sua     on sites for update using (may_demo()) with check (may_demo());

-- Quyền theo cột: khách chỉ thêm và đọc; cột update chỉ có tác dụng khi qua được policy sua.
revoke all on sites from anon, authenticated;
grant insert (slug, content, theme)             on sites to anon;
grant select (slug, content, theme, hidden)     on sites to anon;
grant update (content, theme, updated_at)       on sites to anon;

grant usage on schema public to anon;
grant execute on function may_demo(), site_ok(jsonb) to anon;

create view public_sites as
  select slug, content, theme from sites where not hidden;
grant select on public_sites to anon;

-- Chạy RIÊNG câu này, thay <KHOÁ DEMO> bằng khoá thật, không lưu lại khoá ở đâu ngoài trình quản lý mật khẩu:
-- insert into cau_hinh_rieng values ('demo_key_hash', encode(extensions.digest('<KHOÁ DEMO>', 'sha256'), 'hex'));
