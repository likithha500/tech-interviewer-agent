
create extension if not exists pgcrypto;

-- 1. Candidates
create table public.candidates (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text not null,
    application_id text unique,
    college text,
    created_at timestamptz default now()
);

-- 2. Questions
create table public.questions (
    id uuid primary key default gen_random_uuid(),
    category text not null,
    topic text not null,
    difficulty text not null
        check (difficulty in ('Easy', 'Medium', 'Hard')),
    question text not null,
    expected_answer text,
    time_complexity text,
    space_complexity text,
    evaluation_criteria jsonb default '{}'::jsonb,
    test_cases jsonb default '[]'::jsonb,
    marks integer default 10,
    is_active boolean default true,
    created_at timestamptz default now()
);

-- 3. Interviews
create table public.interviews (
    id uuid primary key default gen_random_uuid(),
    candidate_id uuid references public.candidates(id),
    status text default 'Scheduled',
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz default now()
);

-- 4. Interview rounds
create table public.interview_rounds (
    id uuid primary key default gen_random_uuid(),
    interview_id uuid references public.interviews(id),
    round_type text not null,
    status text default 'Pending',
    sequence_number integer not null,
    created_at timestamptz default now()
);

-- 5. Responses
create table public.responses (
    id uuid primary key default gen_random_uuid(),
    round_id uuid references public.interview_rounds(id),
    question_id uuid references public.questions(id),
    answer text,
    submitted_at timestamptz default now()
);

-- 6. Code submissions
create table public.code_submissions (
    id uuid primary key default gen_random_uuid(),
    round_id uuid references public.interview_rounds(id),
    question_id uuid references public.questions(id),
    language text not null,
    source_code text not null,
    execution_result jsonb,
    passed_test_cases integer default 0,
    total_test_cases integer default 0,
    created_at timestamptz default now()
);

-- 7. Evaluations
create table public.evaluations (
    id uuid primary key default gen_random_uuid(),
    interview_id uuid references public.interviews(id),
    skill text not null,
    score numeric(5,2),
    max_score numeric(5,2),
    evidence jsonb default '[]'::jsonb,
    feedback text,
    created_at timestamptz default now()
);

-- 8. Reports
create table public.reports (
    id uuid primary key default gen_random_uuid(),
    interview_id uuid unique references public.interviews(id),
    overall_score numeric(5,2),
    recommendation text check (
        recommendation in ('Hire', 'Hold', 'Reject')
    ),
    strengths jsonb default '[]'::jsonb,
    weaknesses jsonb default '[]'::jsonb,
    human_review_status text default 'Pending',
    created_at timestamptz default now()
);

-- Enable Row Level Security on all tables
alter table public.candidates enable row level security;
alter table public.questions enable row level security;
alter table public.interviews enable row level security;
alter table public.interview_rounds enable row level security;
alter table public.responses enable row level security;
alter table public.code_submissions enable row level security;
alter table public.evaluations enable row level security;
alter table public.reports enable row level security;
