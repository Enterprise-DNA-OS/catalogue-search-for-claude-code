create table catalogues (
 id uuid primary key default gen_random_uuid(), code text not null unique check(code ~ '^[a-z0-9][a-z0-9-]*$'),
 name text not null check(length(trim(name))>0), owner text not null, purpose text not null,
 review_days integer not null default 30 check(review_days between 1 and 3650),
 retention_days integer not null default 30 check(retention_days between 1 and 3650),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table records (
 id uuid primary key default gen_random_uuid(), catalogue_id uuid not null references catalogues(id),
 object_id text not null check(length(trim(object_id))>0), name text not null check(length(trim(name))>0),
 description text not null default '', category text not null default '', available boolean not null default true,
 status text not null default 'active' check(status in ('active','archived')), boost numeric not null default 0 check(boost between 0 and 100),
 reviewed_on date, expires_on date, raw jsonb not null default '{}',
 search_vector tsvector generated always as (setweight(to_tsvector('english',coalesce(name,'')),'A') || setweight(to_tsvector('english',coalesce(description,'')),'B') || setweight(to_tsvector('english',coalesce(category,'')),'C')) stored,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(catalogue_id,object_id)
);
create index records_search on records using gin(search_vector);
create table synonyms (
 id uuid primary key default gen_random_uuid(), catalogue_id uuid not null references catalogues(id),
 term text not null check(length(trim(term))>0), expansion text not null check(length(trim(expansion))>0),
 owner text not null, review_on date not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(catalogue_id,term)
);
create table relevance_cases (
 id uuid primary key default gen_random_uuid(), catalogue_id uuid not null references catalogues(id),
 query text not null, expected_object_id text not null, max_rank integer not null default 3 check(max_rank between 1 and 100),
 rationale text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(catalogue_id,query,expected_object_id), foreign key(catalogue_id,expected_object_id) references records(catalogue_id,object_id)
);
create table query_events (
 id uuid primary key default gen_random_uuid(), catalogue_id uuid not null references catalogues(id),
 query text not null, result_count integer not null check(result_count>=0), occurred_on date not null default current_date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table tasks (
 id uuid primary key default gen_random_uuid(), catalogue_id uuid not null references catalogues(id),
 title text not null, owner text not null, due_on date not null, status text not null default 'open' check(status in ('open','closed')),
 resolution text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status <> 'closed' or length(trim(resolution))>0)
);
create table notes (
 id uuid primary key default gen_random_uuid(), catalogue_id uuid not null references catalogues(id),
 body text not null, author text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table audit_events (
 id uuid primary key default gen_random_uuid(), catalogue_id uuid references catalogues(id), action text not null,
 actor text not null, detail jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=clock_timestamp(); return new; end $$;
do $$ declare t text; begin
 foreach t in array array['catalogues','records','synonyms','relevance_cases','query_events','tasks','notes','audit_events'] loop
 execute format('create trigger touch_updated_at before update on %I for each row execute function touch_updated_at()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
 end loop;
end $$;
create view catalogue_health as
 select c.id,c.code,c.name,c.owner,
 count(r.id)::int as records,
 count(r.id) filter(where r.status='active' and r.available and (r.expires_on is null or r.expires_on>=current_date))::int as searchable,
 count(r.id) filter(where r.status='active' and (r.reviewed_on is null or r.reviewed_on < current_date-c.review_days))::int as review_due,
 (select count(*)::int from relevance_cases x where x.catalogue_id=c.id) as test_cases,
 (select count(*)::int from tasks x where x.catalogue_id=c.id and x.status='open') as open_tasks
 from catalogues c left join records r on r.catalogue_id=c.id group by c.id;
create view zero_results as
 select c.code,q.query,count(*)::int as attempts,max(q.occurred_on) as last_seen
 from query_events q join catalogues c on c.id=q.catalogue_id where q.result_count=0
 group by c.code,q.query;
create view attention as
 select c.code,'record-review' as kind,r.object_id as reference,r.name as detail,c.owner,
 case when r.reviewed_on is null then null else r.reviewed_on+c.review_days end as due_on
 from records r join catalogues c on c.id=r.catalogue_id
 where r.status='active' and (r.reviewed_on is null or r.reviewed_on < current_date-c.review_days)
 union all
 select c.code,'expired-record',r.object_id,r.name,c.owner,r.expires_on from records r join catalogues c on c.id=r.catalogue_id where r.status='active' and r.expires_on<current_date
 union all
 select c.code,'synonym-review',s.term,s.expansion,s.owner,s.review_on from synonyms s join catalogues c on c.id=s.catalogue_id where s.review_on<current_date
 union all
 select c.code,'overdue-task',t.id::text,t.title,t.owner,t.due_on from tasks t join catalogues c on c.id=t.catalogue_id where t.status='open' and t.due_on<current_date;
revoke all on catalogue_health,zero_results,attention from public;
