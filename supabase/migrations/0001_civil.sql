create function touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=clock_timestamp(); return new; end $$;
create table workers (id uuid primary key default gen_random_uuid(), name text not null, external_id text unique, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger workers_updated before update on workers for each row execute function touch_updated_at();
create table plant (id uuid primary key default gen_random_uuid(), name text not null unique, required_ticket text not null, service_due date not null, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger plant_updated before update on plant for each row execute function touch_updated_at();
create table projects (id uuid primary key default gen_random_uuid(), name text not null unique, client text not null, jurisdiction text not null check(jurisdiction in ('NZ','AU')), status text not null default 'active' check(status in ('active','closed')), last_diary date, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger projects_updated before update on projects for each row execute function touch_updated_at();
create table competencies (id uuid primary key default gen_random_uuid(), worker_id uuid not null references workers, ticket text not null, expires_on date not null, assessed_on date not null, assessor text not null check(length(trim(assessor))>0), unique(worker_id,ticket), check(expires_on>=assessed_on), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger competencies_updated before update on competencies for each row execute function touch_updated_at();
create table inductions (id uuid primary key default gen_random_uuid(), worker_id uuid not null references workers, project_id uuid not null references projects, inducted_on date not null, expires_on date not null, unique(worker_id,project_id), check(expires_on>=inducted_on), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger inductions_updated before update on inductions for each row execute function touch_updated_at();
create table allocations (id uuid primary key default gen_random_uuid(), name text not null unique, project_id uuid not null references projects, worker_id uuid not null references workers, plant_id uuid references plant, work_date date not null, hours numeric(5,2) not null check(hours>0 and hours<=24), unique(worker_id,work_date), unique(plant_id,work_date), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger allocations_updated before update on allocations for each row execute function touch_updated_at();
create table prestarts (id uuid primary key default gen_random_uuid(), plant_id uuid not null references plant, worker_id uuid not null references workers, check_date date not null, result text not null check(result in ('pass','fail')), notes text not null, unique(plant_id,check_date), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger prestarts_updated before update on prestarts for each row execute function touch_updated_at();
create table dockets (id uuid primary key default gen_random_uuid(), name text not null unique, allocation_id uuid not null references allocations, hours numeric(5,2) not null check(hours>0 and hours<=24), quantity numeric(12,2) not null default 0 check(quantity>=0), unit text not null default 'hours', description text not null, approved_by text, approved_on date, invoiced_on date, check((approved_by is null)=(approved_on is null)), check(approved_by is null or length(trim(approved_by))>0), check(invoiced_on is null or approved_on is not null), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger dockets_updated before update on dockets for each row execute function touch_updated_at();
create table import_batches (id uuid primary key default gen_random_uuid(), name text not null unique, digest text not null, row_count integer not null check(row_count>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger import_batches_updated before update on import_batches for each row execute function touch_updated_at();
create table timesheets (id uuid primary key default gen_random_uuid(), worker_id uuid not null references workers, project_id uuid references projects, work_date date not null, hours numeric(7,2) not null check(hours>0 and hours<=24), category text not null default 'Recorded time', source_key text unique, batch_id uuid references import_batches, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger timesheets_updated before update on timesheets for each row execute function touch_updated_at();
create table diary (id uuid primary key default gen_random_uuid(), project_id uuid not null references projects, work_date date not null, notes text not null check(length(trim(notes))>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger diary_updated before update on diary for each row execute function touch_updated_at();

create view allocation_checks as
select a.id, a.name, a.work_date, p.name project, w.name worker, coalesce(e.name,'No plant') plant,
 a.hours, a.project_id, a.worker_id, a.plant_id,
 (not w.active or p.status <> 'active' or (e.id is not null and not e.active)) inactive,
 (e.id is not null and not exists(select 1 from competencies c where c.worker_id=w.id and lower(c.ticket)=lower(e.required_ticket) and c.assessed_on<=a.work_date and c.expires_on>=a.work_date)) ticket_gap,
 not exists(select 1 from inductions i where i.worker_id=w.id and i.project_id=p.id and i.inducted_on<=a.work_date and i.expires_on>=a.work_date) induction_gap,
 (e.id is not null and e.service_due<a.work_date) service_overdue,
 (e.id is not null and not exists(select 1 from prestarts s where s.plant_id=e.id and s.check_date=a.work_date and s.result='pass')) prestart_gap
from allocations a join projects p on p.id=a.project_id join workers w on w.id=a.worker_id left join plant e on e.id=a.plant_id;
create view crew_week as select name,work_date,project,worker,plant,hours,
case when inactive or ticket_gap or induction_gap or service_overdue then 'HOLD'
 when prestart_gap then 'PRESTART REQUIRED' else 'READY FOR SUPERVISOR' end readiness
from allocation_checks where work_date between current_date and current_date+6;
create view docket_register as select d.id,d.name,c.project,c.worker,c.plant,c.work_date,d.hours,d.quantity,d.unit,d.description,d.approved_by,d.approved_on,d.invoiced_on,
 current_date-c.work_date age_days,
 case when d.invoiced_on is not null then 'invoiced' when d.approved_on is not null then 'ready to invoice' else 'awaiting approval' end status
from dockets d join allocation_checks c on c.id=d.allocation_id;
create view time_variance as select a.name,a.work_date,p.name project,w.name worker,a.hours planned_hours,
 coalesce((select sum(t.hours) from timesheets t where t.worker_id=a.worker_id and t.project_id=a.project_id and t.work_date=a.work_date),0) actual_hours,
 coalesce((select sum(t.hours) from timesheets t where t.worker_id=a.worker_id and t.project_id=a.project_id and t.work_date=a.work_date),0)-a.hours variance_hours
from allocations a join workers w on w.id=a.worker_id join projects p on p.id=a.project_id;
create view compliance_findings as
select name record,project,work_date,'competency' rule,'No current assessed plant competency' issue from allocation_checks where ticket_gap
union all select name,project,work_date,'induction','No current site induction' from allocation_checks where induction_gap
union all select name,project,work_date,'service','Plant service overdue' from allocation_checks where service_overdue
union all select name,project,work_date,'prestart','No passing plant prestart for work day' from allocation_checks where prestart_gap and work_date<=current_date
union all select name,project,work_date,'active','Inactive worker, plant or project' from allocation_checks where inactive;
create view attention as
select 'hold' priority, record,project,issue reason from compliance_findings where work_date>=current_date-7
union all select 'chase',name,project,'Docket awaiting approval: '||age_days||' days' from docket_register where approved_on is null and work_date<current_date-2
union all select 'invoice',name,project,'Approved docket not marked invoiced' from docket_register where approved_on is not null and invoiced_on is null
union all select 'diary',name,name,'No diary in the last three days' from projects where status='active' and (last_diary is null or last_diary<current_date-3)
union all select 'map',w.name,'Unassigned','Imported time has no project: '||t.work_date from timesheets t join workers w on w.id=t.worker_id where t.project_id is null;
create view plant_utilisation as select p.name,p.service_due,
 coalesce(sum(a.hours) filter(where a.work_date between current_date and current_date+6),0) allocated_hours_next_week,
 count(a.id) filter(where a.work_date between current_date and current_date+6) booked_days
from plant p left join allocations a on a.plant_id=p.id group by p.id,p.name,p.service_due;
