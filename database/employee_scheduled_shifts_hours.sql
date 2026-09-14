-- Store regular and overtime worked hours on each scheduled shift.
alter table public.employee_scheduled_shifts
    add column if not exists work_hours numeric(5,2) not null default 0,
    add column if not exists overtime_hours numeric(5,2) not null default 0;

comment on column public.employee_scheduled_shifts.work_hours is
    'Actual worked hours between check-in and check-out, minus shift break.';

comment on column public.employee_scheduled_shifts.overtime_hours is
    'Hours worked after the scheduled shift end time.';
