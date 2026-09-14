-- Fields employees use to report task progress and the delivered result.
alter table if exists tasks
    add column if not exists result_url text;

create table if not exists task_links (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references tasks(id) on delete cascade,
    employee_id uuid references employees(id) on delete set null,
    title varchar(150) not null default 'Link kết quả',
    url text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_task_links_task on task_links(task_id);