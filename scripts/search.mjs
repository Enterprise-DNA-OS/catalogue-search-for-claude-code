#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { table } from './lib/format.mjs';

export const tables=['catalogues','records','synonyms','relevance_cases','query_events','tasks','notes','audit_events'];
const flagsByCommand={
 help:[],catalogues:[],records:['catalogue'],record:['catalogue'],search:['catalogue','category','limit'],facets:['catalogue'],
 synonyms:['catalogue'],cases:['catalogue'],'relevance-check':['catalogue'],gaps:['catalogue'],attention:['catalogue'],compliance:['catalogue'],insights:['catalogue'],tasks:['catalogue'],history:['catalogue'],
 'add-catalogue':['code','name','owner','purpose','review-days','retention-days','by'],
 'set-policy':['catalogue','owner','purpose','review-days','retention-days','by'],
 'put-record':['catalogue','object-id','name','description','category','available','status','boost','reviewed-on','expires-on','by'],
 'set-synonym':['catalogue','term','expansion','owner','review-on','by'],
 'add-case':['catalogue','query','expected','max-rank','rationale','by'],
 'log-query':['catalogue','query','result-count','date','by'],
 'add-task':['catalogue','title','owner','due-on','by'],'close-task':['catalogue','resolution','by'],log:['catalogue','note','by'],
 import:['catalogue','map','expected-count','dry-run','by'],export:[],
 'weekly-review':['catalogue'],'draft-search-fix':['catalogue']
};
const reads=new Set(['help','catalogues','records','record','search','facets','synonyms','cases','relevance-check','gaps','attention','compliance','insights','tasks','history','export','weekly-review','draft-search-fix']);
export function parse(argv){
 const pos=[],f={};
 for(const a of argv){
  if(a.startsWith('--')){const [key,...rest]=a.slice(2).split('=');if(key in f)throw Error(`Duplicate flag --${key}`);f[key]=rest.length?rest.join('='):true;}
  else pos.push(a);
 }
 const cmd=pos.shift()||'help';if(!(cmd in flagsByCommand))throw Error(`Unknown command ${cmd}; use help`);
 for(const k of Object.keys(f))if(k!=='json'&&!flagsByCommand[cmd].includes(k))throw Error(`Unknown flag --${k} for ${cmd}`);
 for(const k of ['json','dry-run'])if(k in f && f[k]!==true)throw Error(`--${k} takes no value`);
 return {cmd,pos,f};
}
function text(v,label){if(typeof v!=='string'||!v.trim())throw Error(`${label} is required`);return v.trim();}
function integer(v,label,min=0,max=100000000){if(!/^\d+$/.test(String(v))||Number(v)<min||Number(v)>max)throw Error(`${label} must be an integer ${min}..${max}`);return Number(v);}
function date(v,label,nullable=false){if(nullable&&(v===null||v==='unknown'))return null; const s=text(v,label);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw Error(`Invalid ${label}`);return s;}
function bool(v){if(v===true||v==='true')return true;if(v===false||v==='false')return false;throw Error('available must be true or false');}
function cleanQuery(v){const q=text(v,'query');if(q.length>200)throw Error('query exceeds 200 characters');if(/@|\b\d{7,}\b/.test(q))throw Error('Remove apparent personal identifiers before using a query');return q;}
async function resolve(db,t,ref,cat){
 text(ref,'record reference'); const column=t==='catalogues'?'code':t==='records'?'object_id':null;
 const name=t==='tasks'?'title':'name';
 const all=await db.query(`select * from ${t}${cat?' where catalogue_id=$1':''}` ,cat?[cat]:[]);
 const lower=ref.toLowerCase();
 let found=all.filter(r=>r.id.toLowerCase()===lower||(column&&r[column].toLowerCase()===lower)||r[name]?.toLowerCase()===lower);
 if(!found.length)found=all.filter(r=>r.id.toLowerCase().startsWith(lower)||r[name]?.toLowerCase().includes(lower));
 if(found.length!==1)throw Error(`${found.length?'Ambiguous':'No matching'} ${t}: ${ref}\n${(found.length?found:all).map(r=>`${r.id} ${column?r[column]:''} ${r[name]}`).join('\n')}`);
 return found[0];
}
async function catalogue(db,f){return resolve(db,'catalogues',text(f.catalogue,'--catalogue'));}
async function audit(db,c,action,actor,detail){await db.query('insert into audit_events(catalogue_id,action,actor,detail) values($1,$2,$3,$4)',[c?.id||null,action,actor,JSON.stringify(detail)]);}
export async function search(db,c,q,{category=null,limit=20}={}){
 q=cleanQuery(q);
 const syn=await db.query('select expansion from synonyms where catalogue_id=$1 and lower(term)=lower($2) order by term',[c.id,q]);
 const variants=[q,...syn.map(r=>r.expansion)];
 return db.query(`with terms as (select plainto_tsquery('english',v) as term from unnest($2::text[]) v)
 select r.object_id,r.name,r.category,round((max(ts_rank_cd(r.search_vector,t.term))+r.boost/1000)::numeric,5) as score
 from records r cross join terms t where r.catalogue_id=$1 and r.status='active' and r.available
 and (r.expires_on is null or r.expires_on>=current_date) and ($3::text is null or r.category=$3)
 and r.search_vector @@ t.term group by r.id order by score desc,r.object_id limit $4`,[c.id,variants,category,limit]);
}
export async function relevance(db,c){
 const cases=await db.query('select * from relevance_cases where catalogue_id=$1 order by query,expected_object_id',[c.id]);
 const out=[];
 for(const r of cases){const hits=await search(db,c,r.query,{limit:100});const i=hits.findIndex(h=>h.object_id===r.expected_object_id);out.push({query:r.query,expected:r.expected_object_id,rank:i<0?null:i+1,max_rank:r.max_rank,result:i>=0&&i<r.max_rank?'PASS':'FAIL',rationale:r.rationale});}
 return out;
}
export async function compliance(db,c){
 const out=[];const flag=(rule,reference,finding,source)=>out.push({rule,reference,finding,source});
 if(!c.owner.trim()||!c.purpose.trim())flag('purpose',c.code,'Assign a purpose and responsible owner','https://www.privacy.org.nz/privacy-principles/1/');
 const old=await db.query('select count(*)::int as n from query_events where catalogue_id=$1 and occurred_on<current_date-$2::int',[c.id,c.retention_days]);
 if(old[0].n)flag('retention',c.code,`${old[0].n} query events exceed the chosen ${c.retention_days}-day retention period; review lawful retention and arrange removal`,'https://www.privacy.org.nz/privacy-principles/9/');
 const stale=await db.query("select object_id from records where catalogue_id=$1 and status='active' and (reviewed_on is null or reviewed_on<current_date-$2::int)",[c.id,c.review_days]);
 for(const r of stale)flag('catalogue-policy',r.object_id,'Source review missing or overdue under your catalogue policy','local:catalogue review_days policy, not a statutory interval');
 return out;
}
const insightQueries={
 'stale-categories':"select category,count(*)::int as stale from records where catalogue_id=$1 and status='active' and (reviewed_on is null or reviewed_on<current_date-(select review_days from catalogues where id=$1)) group by category order by stale desc,category",
 'missing-descriptions':"select object_id,name from records where catalogue_id=$1 and description='' order by object_id",
 'stock-gaps':"select r.object_id,r.name,count(x.id)::int as affected_cases from records r left join relevance_cases x on x.catalogue_id=r.catalogue_id and x.expected_object_id=r.object_id where r.catalogue_id=$1 and not r.available group by r.id order by affected_cases desc,r.object_id",
 'expired-offers':"select object_id,name,expires_on from records where catalogue_id=$1 and status='active' and expires_on<current_date order by expires_on,object_id",
 'untested-categories':"select r.category,count(*)::int as untested_records from records r where r.catalogue_id=$1 and r.status='active' and not exists(select 1 from relevance_cases x where x.catalogue_id=r.catalogue_id and x.expected_object_id=r.object_id) group by r.category order by untested_records desc,r.category",
 'synonym-debt':"select term,expansion,owner,review_on from synonyms where catalogue_id=$1 and review_on<current_date order by review_on,term",
 'owner-backlog':"select owner,count(*)::int as open_tasks,count(*) filter(where due_on<current_date)::int as overdue from tasks where catalogue_id=$1 and status='open' group by owner order by overdue desc,owner",
 'retention-review':"select occurred_on,count(*)::int as events from query_events where catalogue_id=$1 and occurred_on<current_date-(select retention_days from catalogues where id=$1) group by occurred_on order by occurred_on",
 'zero-demand':"select query,count(*)::int as attempts,max(occurred_on) as last_seen from query_events where catalogue_id=$1 and result_count=0 group by query order by attempts desc,query",
 'failed-expectations':null
};
export function format(rows){if(!Array.isArray(rows))rows=[rows];if(!rows.length)return '  (none)';const keys=Object.keys(rows[0]);return table(rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v&&typeof v==='object'?JSON.stringify(v):v]))),keys.map(k=>({key:k,label:k,width:k==='source'?95:70})));}
function privateWrite(file,data){fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,data,{flag:'wx',mode:0o600});}
function readPath(obj,key){return key.split('.').reduce((v,k)=>v?.[k],obj);}
function recordValues(input){
 const name=text(input.name,'record name'), objectId=text(input.object_id,'objectID');
 for(const key of ['description','category'])if(input[key]!==undefined&&input[key]!==null&&typeof input[key]!=='string')throw Error(`${key} must be a string; map multi-valued attributes explicitly`);
 const boost=input.boost??0;if(String(boost).trim()===''||!Number.isFinite(Number(boost))||Number(boost)<0||Number(boost)>100)throw Error('boost must be 0..100');
 const status=input.status??'active';if(!['active','archived'].includes(status))throw Error('status must be active or archived');
 return [objectId,name,String(input.description??''),String(input.category??''),input.available===undefined?true:bool(input.available),status,Number(boost),input.reviewed_on?date(input.reviewed_on,'reviewed_on',true):null,input.expires_on?date(input.expires_on,'expires_on',true):null,JSON.stringify(input.raw??{})];
}
async function putRecord(db,c,input){return db.query(`insert into records(catalogue_id,object_id,name,description,category,available,status,boost,reviewed_on,expires_on,raw)
 values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) on conflict(catalogue_id,object_id) do update set name=excluded.name,description=excluded.description,category=excluded.category,available=excluded.available,status=excluded.status,boost=excluded.boost,reviewed_on=excluded.reviewed_on,expires_on=excluded.expires_on,raw=excluded.raw returning object_id,name,status`,[c.id,...recordValues(input)]);}
async function importAlgolia(db,c,file,f){
 const body=fs.readFileSync(text(file,'input JSON file'),'utf8').replace(/^\uFEFF/,'');const parsed=JSON.parse(body);
 if(parsed.cursor)throw Error('Incomplete browse export: follow every cursor and combine hits before importing');
 const records=Array.isArray(parsed)?parsed:parsed.hits;
 if(!Array.isArray(records))throw Error('Expected an Algolia record array or complete browse response with hits');
 if(records.length!==integer(f['expected-count'],'--expected-count'))throw Error('Export count does not match --expected-count');
 const map=f.map?JSON.parse(fs.readFileSync(text(f.map,'map file'),'utf8')):{object_id:'objectID',name:'name',description:'description',category:'category',available:'available'};
 const allowed=new Set(['object_id','name','description','category','available','status','boost','reviewed_on','expires_on']);
 for(const [k,v] of Object.entries(map))if(!allowed.has(k)||typeof v!=='string'||!v)throw Error(`Invalid mapping ${k}`);
 if(!map.object_id||!map.name)throw Error('Mapping must specify object_id and name');
 const seen=new Set();
 for(const r of records){
  if(!r||typeof r!=='object'||Array.isArray(r))throw Error('Each record must be an object');
  const input=Object.fromEntries(Object.entries(map).map(([k,v])=>[k,readPath(r,v)]));input.raw=r;
  // Algolia objectID is a string. Other unknown fields stay intact in raw.
  const id=text(input.object_id,'objectID');if(seen.has(id))throw Error(`Duplicate objectID ${id}`);seen.add(id);
  await putRecord(db,c,input);
 }
 return [{records:records.length,dry_run:Boolean(f['dry-run']),sha256:createHash('sha256').update(body).digest('hex')}];
}
async function execute(db,{cmd,pos,f}){
 if(cmd==='help')return Object.entries(flagsByCommand).map(([command,flags])=>({command,flags:flags.map(x=>'--'+x).join(' ')}));
 if(cmd==='catalogues')return db.query('select code,name,owner,records,searchable,review_due,test_cases,open_tasks from catalogue_health order by code');
 if(cmd==='add-catalogue')return db.query('insert into catalogues(code,name,owner,purpose,review_days,retention_days) values($1,$2,$3,$4,$5,$6) returning code,name',[
 text(f.code,'code'),text(f.name,'name'),text(f.owner,'owner'),text(f.purpose,'purpose'),integer(f['review-days']??30,'review-days',1,3650),integer(f['retention-days']??30,'retention-days',1,3650)]);
 if(cmd==='export'){
  const out=path.resolve(text(pos[0],'new export directory'));if(fs.existsSync(out))throw Error('Export directory already exists');
  const snapshot={format:'catalogue-search-v1',exported_at:new Date().toISOString(),tables:{}};
  for(const t of tables)snapshot.tables[t]=await db.query(`select ${t==='records'?'id,catalogue_id,object_id,name,description,category,available,status,boost,reviewed_on,expires_on,raw,created_at,updated_at':'*'} from ${t} order by id`);
  privateWrite(path.join(out,'snapshot.json'),JSON.stringify(snapshot,null,2)+'\n');
  for(const c of snapshot.tables.catalogues){const records=snapshot.tables.records.filter(r=>r.catalogue_id===c.id).map(r=>({...r.raw,objectID:r.object_id,name:r.name,description:r.description,category:r.category,available:r.available,status:r.status,boost:r.boost,reviewed_on:r.reviewed_on,expires_on:r.expires_on}));privateWrite(path.join(out,c.code+'.json'),JSON.stringify(records,null,2)+'\n');}
  return [{directory:out,tables:tables.length,records:snapshot.tables.records.length}];
 }
 const c=await catalogue(db,f);
 switch(cmd){
 case 'records':return db.query('select object_id,name,category,available,status,reviewed_on,expires_on from records where catalogue_id=$1 order by object_id',[c.id]);
 case 'record':{const r=await resolve(db,'records',text(pos[0],'record'),c.id);delete r.search_vector;return [r];}
 case 'search':return search(db,c,pos.join(' '),{category:f.category||null,limit:integer(f.limit??20,'limit',1,100)});
 case 'facets':return db.query("select category,count(*)::int as records from records where catalogue_id=$1 and status='active' and available and (expires_on is null or expires_on>=current_date) group by category order by category",[c.id]);
 case 'synonyms':return db.query('select term,expansion,owner,review_on from synonyms where catalogue_id=$1 order by term',[c.id]);
 case 'cases':return db.query('select query,expected_object_id,max_rank,rationale from relevance_cases where catalogue_id=$1 order by query',[c.id]);
 case 'relevance-check':return relevance(db,c);
 case 'gaps':return db.query('select query,attempts,last_seen from zero_results where code=$1 order by attempts desc,query',[c.code]);
 case 'attention':return db.query('select kind,reference,detail,owner,due_on from attention where code=$1 order by due_on nulls first,kind,reference',[c.code]);
 case 'compliance':return compliance(db,c);
 case 'tasks':return db.query('select id,title,owner,due_on,status,resolution from tasks where catalogue_id=$1 order by due_on,id',[c.id]);
 case 'history':return db.query('select action,actor,detail,created_at from audit_events where catalogue_id=$1 order by created_at,id',[c.id]);
 case 'insights':{const key=pos[0];if(!(key in insightQueries))throw Error(`Choose insight: ${Object.keys(insightQueries).join(', ')}`);return key==='failed-expectations'?(await relevance(db,c)).filter(x=>x.result==='FAIL'):db.query(insightQueries[key],[c.id]);}
 case 'set-policy':return db.query('update catalogues set owner=$2,purpose=$3,review_days=$4,retention_days=$5 where id=$1 returning code,owner,purpose,review_days,retention_days',[c.id,f.owner===undefined?c.owner:text(f.owner,'owner'),f.purpose===undefined?c.purpose:text(f.purpose,'purpose'),integer(f['review-days']??c.review_days,'review-days',1,3650),integer(f['retention-days']??c.retention_days,'retention-days',1,3650)]);
 case 'put-record':{
  const id=text(f['object-id'],'object-id');const old=(await db.query('select * from records where catalogue_id=$1 and object_id=$2',[c.id,id]))[0]||{};
  const input={...old,object_id:id};for(const key of ['name','description','category','available','status','boost','reviewed-on','expires-on'])if(key in f)input[key.replaceAll('-','_')]=f[key];
  return putRecord(db,c,input);
 }
 case 'set-synonym':return db.query('insert into synonyms(catalogue_id,term,expansion,owner,review_on) values($1,$2,$3,$4,$5) on conflict(catalogue_id,term) do update set expansion=excluded.expansion,owner=excluded.owner,review_on=excluded.review_on returning term,expansion,owner,review_on',[c.id,cleanQuery(f.term).toLowerCase(),cleanQuery(f.expansion),text(f.owner,'owner'),date(f['review-on'],'review-on')]);
 case 'add-case':return db.query('insert into relevance_cases(catalogue_id,query,expected_object_id,max_rank,rationale) values($1,$2,$3,$4,$5) on conflict(catalogue_id,query,expected_object_id) do update set max_rank=excluded.max_rank,rationale=excluded.rationale returning query,expected_object_id,max_rank',[c.id,cleanQuery(f.query),text(f.expected,'expected'),integer(f['max-rank']??3,'max-rank',1,100),text(f.rationale,'rationale')]);
 case 'log-query':return db.query('insert into query_events(catalogue_id,query,result_count,occurred_on) values($1,$2,$3,coalesce($4::date,current_date)) returning query,result_count,occurred_on',[c.id,cleanQuery(f.query),integer(f['result-count'],'result-count'),f.date?date(f.date,'date'):null]);
 case 'add-task':return db.query('insert into tasks(catalogue_id,title,owner,due_on) values($1,$2,$3,$4) returning id,title,owner,due_on',[c.id,text(f.title,'title'),text(f.owner,'owner'),date(f['due-on'],'due-on')]);
 case 'close-task':{const t=await resolve(db,'tasks',text(pos[0],'task'),c.id);return db.query("update tasks set status='closed',resolution=$2 where id=$1 returning id,title,status,resolution",[t.id,text(f.resolution,'resolution')]);}
 case 'log':return db.query('insert into notes(catalogue_id,body,author) values($1,$2,$3) returning body,author,created_at',[c.id,text(f.note,'note'),text(f.by,'by')]);
 case 'import':if(pos[0]!=='algolia')throw Error('Use import algolia <JSON file>');return importAlgolia(db,c,pos[1],f);
 case 'weekly-review':case 'draft-search-fix':{
  const gaps=await db.query('select query,attempts,last_seen from zero_results where code=$1 order by attempts desc,query',[c.code]);
  const checks=await relevance(db,c);const work=await db.query('select kind,reference,detail,owner,due_on from attention where code=$1 order by due_on nulls first,kind,reference',[c.code]);
  const output=`# ${cmd==='weekly-review'?'Weekly search review':'Draft search correction brief'}: ${c.name}\n\nPrepared from current records. Review before any website change.\n\n## Searches with no results\n\n\`\`\`text\n${format(gaps)}\n\`\`\`\n\n## Relevance checks\n\n\`\`\`text\n${format(checks)}\n\`\`\`\n\n## Follow-up work\n\n\`\`\`text\n${format(work)}\n\`\`\`\n\nOwner: ${c.owner}. Confirm the catalogue source, correct the record or synonym, then rerun the expected searches. Nothing has been sent or deployed.\n`;
  const file=path.join(process.env.OUTPUT_DIR||REPO_ROOT,'drafts',`${cmd}-${c.code}-${randomUUID()}.md`);privateWrite(file,output);return [{draft:file,gaps:gaps.length,failed_checks:checks.filter(x=>x.result==='FAIL').length,attention:work.length}];
 }
 }
}
export async function run(db,args){
 const parsed=parse(args);const {cmd,f}=parsed;const mutates=!reads.has(cmd);if(mutates)text(f.by,'--by');
 await db.exec(mutates?'BEGIN':'BEGIN READ ONLY');
 try{
  const rows=await execute(db,parsed);
  if(mutates){const c=f.catalogue?await catalogue(db,f):cmd==='add-catalogue'?await resolve(db,'catalogues',f.code):null;await audit(db,c,cmd,f.by,{fields:Object.fromEntries(Object.entries(f).filter(([key])=>!['json','by','dry-run'].includes(key))),result:rows});}
  await db.exec(f['dry-run']?'ROLLBACK':'COMMIT');return rows;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 let db;
 try{db=await getDb();const rows=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(rows,null,2):format(rows));}
 catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}
}
