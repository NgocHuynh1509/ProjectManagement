-- Leave requests used by the employee portal.
create table if not exists leave_requests (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid not null references employees(id) on delete cascade,
    leave_type varchar(30) not null,
    start_date date not null,
    end_date date not null,
    reason text,
    status varchar(20) not null default 'pending',
    reviewed_by uuid references employees(id) on delete set null,
    reviewed_at timestamptz,
    review_note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint leave_requests_date_check check (start_date <= end_date),
    constraint leave_requests_type_check check (
        leave_type in ('annual', 'sick', 'unpaid', 'personal')
    ),
    constraint leave_requests_status_check check (
        status in ('pending', 'approved', 'rejected', 'cancelled')
    )
);

create index if not exists idx_leave_requests_employee_created
    on leave_requests(employee_id, created_at desc);
