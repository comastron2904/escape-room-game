-- 한옥마을 방탈출 — Supabase 테이블
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여 넣고 Run 하세요. (여러 번 실행해도 안전)

create extension if not exists pgcrypto;

-- 교사가 만든 구성 (이야기 + 교과 문제 7개)
create table if not exists public.configs (
  code        text primary key,
  title       text not null,
  story       text not null,
  puzzles     jsonb not null,          -- [{ q, image, type: 'number'|'direction', answer, hint }]
  final_seq   text not null,           -- 마지막 석단 퍼즐 정답 (예: NESWNEW)
  cooldown    jsonb not null default '{"first":3,"step":3,"max":30}', -- 오답 대기 시간(초)
  edit_hash   text not null,           -- 편집 비밀번호 (scrypt)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 학생 한 명의 한 판 (시작 시각은 서버가 기록)
create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null references public.configs(code) on delete cascade,
  nickname    text not null,
  started_at  timestamptz not null default now(),
  solved      int[] not null default '{}',
  hint_keys   text[] not null default '{}',
  wrong       int not null default 0,
  penalties   jsonb not null default '{}', -- 문제별 오답 횟수와 대기 끝 시각 { "p3": { "n": 2, "until": 1700000000000 } }
  finished_at timestamptz,
  elapsed_ms  bigint,
  hints       int,
  score_ms    bigint
);
-- 예전에 만든 테이블에 새 칸 추가 (이미 있으면 건너뜀)
alter table public.configs add column if not exists cooldown jsonb not null default '{"first":3,"step":3,"max":30}';
alter table public.sessions add column if not exists penalties jsonb not null default '{}';
-- 대기실 (교사가 시작·종료). 교사가 '시작'을 누르기 전에는 항상 대기
alter table public.configs add column if not exists status text not null default 'waiting';
alter table public.configs add column if not exists round int not null default 1;
alter table public.configs add column if not exists room_started_at timestamptz;
alter table public.configs add column if not exists room_ended_at timestamptz;
alter table public.sessions add column if not exists round int not null default 1;
alter table public.sessions add column if not exists last_seen timestamptz default now();

create index if not exists sessions_board_idx on public.sessions (code, score_ms) where finished_at is not null;
create index if not exists sessions_code_idx on public.sessions (code);

-- 보안: 브라우저(anon)에서는 아무것도 직접 읽고 쓸 수 없게 막고,
-- Vercel 서버 함수(service_role 키)만 접근합니다. (정답이 학생에게 노출되지 않음)
alter table public.configs enable row level security;
alter table public.sessions enable row level security;
revoke all on public.configs from anon, authenticated;
revoke all on public.sessions from anon, authenticated;
-- 서버(service_role)에는 권한을 분명히 줌 (새 프로젝트는 기본 권한이 없을 수 있음)
grant usage on schema public to service_role;
grant all on public.configs, public.sessions to service_role;

-- 문제 그림 저장소 (공개 읽기 버킷). 그림 올리기는 서버(service_role)만 할 수 있습니다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quiz-images', 'quiz-images', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true;

-- 서버가 새 칸을 바로 알아보게 새로고침
notify pgrst, 'reload schema';
