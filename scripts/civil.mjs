#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {table} from './lib/format.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {entities} from './lib/domain.mjs';

export const reads={
 'crew-week':'select * from crew_week order by work_date,name',
 attention:"select * from attention order by case priority when 'hold' then 0 when 'chase' then 1 else 2 end,record,reason",
 projects:'select id,name,client,jurisdiction,status,last_diary from projects order by name',
 workers:'select id,name,external_id,active from workers order by name',
 plant:'select * from plant_utilisation order by service_due,name',
 'tickets-due':`select w.name worker,c.ticket,c.assessed_on,c.expires_on,c.assessor,c.expires_on-current_date days_left from competencies c join workers w on w.id=c.worker_id where c.expires_on<=current_date+60 order by c.expires_on,w.name`,
 inductions:'select w.name worker,p.name project,i.inducted_on,i.expires_on from inductions i join workers w on w.id=i.worker_id join projects p on p.id=i.project_id order by i.expires_on',
 prestarts:'select e.name plant,w.name worker,s.check_date,s.result,s.notes from prestarts s join plant e on e.id=s.plant_id join workers w on w.id=s.worker_id order by s.check_date desc,e.name',
 dockets:'select name,project,work_date,hours,quantity,unit,status,age_days from docket_register order by work_date,name',
 'invoice-ready':"select name,project,work_date,hours,quantity,unit,approved_by from docket_register where status='ready to invoice' order by work_date,name",
 'time-check':'select * from time_variance order by work_date,name',
 timesheets:'select t.id,w.name worker,p.name project,t.work_date,t.hours,t.category from timesheets t join workers w on w.id=t.worker_id left join projects p on p.id=t.project_id order by t.work_date,w.name,t.id',
 diary:'select d.id,p.name project,d.work_date,d.notes from diary d join projects p on p.id=d.project_id order by d.work_date desc,d.id',
 compliance:"select * from compliance_findings order by work_date,record,rule"
};
const refs={worker_id:'workers',plant_id:'plant',project_id:'projects',allocation_id:'allocations'};
export async function resolve(db,entity,value){
 if(!entities[entity])throw Error(`Unknown entity: ${entity}`);
 if(!value)throw Error(`Missing ${entity} reference`);
 const name=entities[entity].includes('name');
 const rows=await db.query(`select id${name?',name':''} from ${entity} where id::text=$1 ${name?'or lower(name)=lower($1)':''}`, [String(value)]);
 if(rows.length===1)return rows[0].id;
 const candidates=rows.length?rows:await db.query(`select id${name?',name':''} from ${entity} where starts_with(id::text,$1) ${name?'or position(lower($1) in lower(name))>0':''} order by id`,[String(value)]);
 if(candidates.length!==1)throw Error(`${entity}: ${candidates.length?'ambiguous':'not found'} '${value}'\n${JSON.stringify(candidates,null,2)}`);
 return candidates[0].id;
}
function flags(args){const opts={},pos=[];for(let i=0;i<args.length;i++){const s=args[i];if(!s.startsWith('--'))pos.push(s);else {const [k,...v]=s.slice(2).split('=');if(v.length)opts[k]=v.join('=');else if(['json','dry-run'].includes(k))opts[k]=true;else if(args[i+1]&&!args[i+1].startsWith('--'))opts[k]=args[++i];else throw Error(`Missing value for --${k}`);}}return {opts,pos};}
function date(v){
 let s=String(v).trim();if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)){const [d,m,y]=s.split('/');s=`${y}-${m}-${d}`;}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number.isNaN(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw Error(`Invalid date '${v}': use YYYY-MM-DD or DD/MM/YYYY`);return s;
}
function hours(v){if(!/^\d+(\.\d{1,2})?$/.test(String(v).trim())||Number(v)<=0||Number(v)>24)throw Error(`Invalid recorded hours: ${v}`);return Number(v);}
async function transaction(db,fn,dry=false){await db.exec('BEGIN');try{const r=await fn();await db.exec(dry?'ROLLBACK':'COMMIT');return r;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function importAssignar(db,file,opts){
 if(!file||!opts.batch)throw Error('import assignar <csv> --batch=<unique-export-name> [--project=<name>] [--dry-run]');
 const raw=fs.readFileSync(path.resolve(file),'utf8');const rows=parseCsv(raw);if(!rows.length)throw Error('CSV contains no records');
 const required=['Emp. Co/Last Name','Emp. First Name','Employee. Card ID','Payroll Category','Date','Units'];
 for(const h of required)if(!Object.keys(rows[0]).some(k=>k.toLowerCase()===h.toLowerCase()))throw Error(`Missing Assignar MYOB export column: ${h}`);
 const project=opts.project?await resolve(db,'projects',opts.project):null;
 const digest=createHash('sha256').update(raw+'\n'+(project||'')).digest('hex');
 return transaction(db,async()=>{
  const old=await db.query('select * from import_batches where name=$1',[opts.batch]);
  if(old.length){if(old[0].digest!==digest)throw Error('Batch changed. Reconcile corrections before using another batch name. No records changed.');return [{batch:opts.batch,imported:0,already_imported:old[0].row_count,dry_run:!!opts['dry-run']}];}
  const [batch]=await db.query('insert into import_batches(name,digest,row_count) values($1,$2,$3) returning id',[opts.batch,digest,rows.length]);
  let total=0;
  for(const [idx,row] of rows.entries()){
   const external=pick(row,'Employee. Card ID').trim(), first=pick(row,'Emp. First Name').trim(),last=pick(row,'Emp. Co/Last Name').trim(),category=pick(row,'Payroll Category').trim();
   if(!external||!first||!last||!category)throw Error(`Row ${idx+2}: employee id, first/last name and category required`);
   const day=date(pick(row,'Date'));const h=hours(pick(row,'Units'));total+=h;
   const [w]=await db.query('insert into workers(name,external_id) values($1,$2) on conflict(external_id) do update set name=excluded.name returning id',[`${first} ${last}`,external]);
   // Reject overlap across batches, while preserving activity rows within this batch.
   const overlap=await db.query('select id from timesheets where worker_id=$1 and work_date=$2 and batch_id is distinct from $3',[w.id,day,batch.id]);
   if(overlap.length)throw Error(`Row ${idx+2}: ${external} already has time on ${day} outside this batch. Reconcile overlapping exports first.`);
   const source=opts.batch+':'+idx;
   await db.query('insert into timesheets(worker_id,project_id,work_date,hours,category,source_key,batch_id) values($1,$2,$3,$4,$5,$6,$7)',[w.id,project,day,h,category,source,batch.id]);
   const [sum]=await db.query('select sum(hours) total from timesheets where worker_id=$1 and work_date=$2',[w.id,day]);if(Number(sum.total)>24)throw Error(`Row ${idx+2}: employee daily total exceeds 24 hours`);
  }
  return [{batch:opts.batch,imported:rows.length,recorded_hours:Math.round(total*100)/100,unassigned_project:!project,dry_run:!!opts['dry-run']}];
 },!!opts['dry-run']);
}
async function add(db,entity,data,record=null){
 if(!entities[entity]||entity==='import_batches')throw Error(`Unknown or managed entity: ${entity}`);
 const allowed=entities[entity].filter(k=>!['source_key','batch_id','last_diary','approved_by','approved_on','invoiced_on'].includes(k));
 for(const k of Object.keys(data)){if(!allowed.includes(k))throw Error(`Unsupported ${entity} field: ${k}`);if(refs[k]&&data[k]!==null)data[k]=await resolve(db,refs[k],data[k]);}
 for(const [k,v] of Object.entries(data)){if(/(_on|_due|_date)$/.test(k)&&v!==null)data[k]=date(v);if(k==='hours')data[k]=hours(v);}
 const keys=Object.keys(data);if(!keys.length)throw Error('No fields supplied');
 return transaction(db,async()=>{
  const id=record?await resolve(db,entity,record):null;
  const rows=id?await db.query(`update ${entity} set ${keys.map((k,i)=>k+'=$'+(i+1)).join(',')} where id=$${keys.length+1} returning *`,[...keys.map(k=>data[k]),id]):await db.query(`insert into ${entity}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,keys.map(k=>data[k]));
  if(entity==='allocations'){
   const [c]=await db.query('select * from allocation_checks where id=$1',[rows[0].id]);
   if(c.inactive||c.ticket_gap||c.induction_gap||c.service_overdue)throw Error('Allocation held: active records, current competency, induction and plant service required');
  }
  if(entity==='diary'&&record)throw Error('Diary entries are append-only. Add a correction note instead.');
  if(entity==='timesheets'&&record)throw Error('Recorded time corrections require reconciliation against the source export.');
  if(entity==='dockets'&&record&&(rows[0].approved_on||rows[0].invoiced_on))throw Error('Approved docket is locked. Record a separate correction.');
  if(entity==='prestarts'&&record&&rows[0].result==='pass'&&!data.notes)throw Error('A passed correction requires new evidence in notes');
  if(entity==='diary')await db.query('update projects set last_diary=greatest(last_diary,$1::date) where id=$2',[data.work_date,data.project_id]);
  if(entity==='timesheets'){const [sum]=await db.query('select sum(hours) total from timesheets where worker_id=$1 and work_date=$2',[data.worker_id,data.work_date]);if(Number(sum.total)>24)throw Error('Employee daily total exceeds 24 hours');}
  return rows;
 });
}
export async function run(db,args){
 const {opts,pos}=flags(args);const [cmd='help',arg,file]=pos;
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='help')return [{commands:Object.keys(reads).join(', ')},{commands:'set <entity> <id or name> --data=<json-file> | project <name> | dispatch <allocation> | add <entity> --data=<json-file> | log --project=<name> --date=<date> --notes=<text>'},{commands:'approve-docket <name> --by=<person> --date=<date> | mark-invoiced <docket> --date=<date>'},{commands:'import assignar <csv> --batch=<name> [--project=<name>] [--dry-run] | export [--out=<file>] | draft-docket <name>'}];
 if(cmd==='project') {const id=await resolve(db,'projects',arg);return {project:await db.query('select * from projects where id=$1',[id]),allocations:await db.query('select * from allocation_checks where project_id=$1 order by work_date',[id]),diary:await db.query('select work_date,notes from diary where project_id=$1 order by work_date',[id])};}
 if(cmd==='dispatch') {const id=await resolve(db,'allocations',arg);const [c]=await db.query('select * from allocation_checks where id=$1',[id]);if(c.inactive||c.ticket_gap||c.induction_gap||c.service_overdue||c.prestart_gap)throw Error('Dispatch held: resolve competency, induction, service, active-record or prestart findings');return [{allocation:c.name,result:'Recorded checks passed. Supervisor must verify conditions on site.'}];}
 if(cmd==='set'){if(!opts.data||!file)throw Error('set <entity> <id or name> --data=<json-file>');return add(db,arg,JSON.parse(fs.readFileSync(opts.data,'utf8')),file);}
 if(cmd==='add'){if(!opts.data)throw Error('add needs --data=<json-file>');return add(db,arg,JSON.parse(fs.readFileSync(opts.data,'utf8')));}
 if(cmd==='log')return add(db,'diary',{project_id:opts.project,work_date:date(opts.date||new Date().toISOString().slice(0,10)),notes:opts.notes});
 if(cmd==='approve-docket'||cmd==='mark-invoiced'){
  const id=await resolve(db,'dockets',arg);const day=date(opts.date||new Date().toISOString().slice(0,10));
  return transaction(db,async()=>{const [d]=await db.query('select d.*,a.work_date from dockets d join allocations a on a.id=d.allocation_id where d.id=$1 for update of d',[id]);
   if(day<d.work_date)throw Error('Date cannot precede work');if(d.invoiced_on)throw Error('Docket already marked invoiced');
   if(cmd==='approve-docket'){if(d.approved_on)throw Error('Docket already approved');if(!opts.by?.trim())throw Error('Approval requires --by=<person>');return db.query('update dockets set approved_by=$1,approved_on=$2 where id=$3 returning name,approved_by,approved_on',[opts.by.trim(),day,id]);}
   if(!d.approved_on)throw Error('Client approval required before marking invoiced');if(day<d.approved_on)throw Error('Invoice date cannot precede approval');return db.query('update dockets set invoiced_on=$1 where id=$2 returning name,invoiced_on',[day,id]);
  });
 }
 if(cmd==='import'){if(arg!=='assignar')throw Error('Only import assignar is supported');return importAssignar(db,file,opts);}
 if(cmd==='export'){
  const out=path.resolve(opts.out||path.join(REPO_ROOT,'exports',`civil-${Date.now()}.json`));const snapshot={format:'civil-contractor/v1',exported_at:new Date().toISOString(),records:{}};
  await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');try{for(const e of Object.keys(entities))snapshot.records[e]=await db.query(`select * from ${e} order by id`);await db.exec('COMMIT');}catch(e){await db.exec('ROLLBACK');throw e;}
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(snapshot,null,2)+'\n',{flag:'wx'});return [{file:out,entities:Object.keys(entities).length}];
 }
 if(cmd==='draft-docket'){
  const id=await resolve(db,'dockets',arg);const [d]=await db.query('select * from docket_register where id=$1',[id]);const out=path.join(REPO_ROOT,'drafts',`docket-${id}-${Date.now()}.md`);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,`# Draft docket approval request\n\nProject: ${d.project}\nDocket: ${d.name}\nWork date: ${d.work_date}\nWork: ${d.description}\nRecorded hours: ${d.hours}\nQuantity: ${d.quantity} ${d.unit}\n\nPlease review this record and confirm or correct the work described.\n\nDraft only. No message has been sent.\n`,{flag:'wx'});return [{file:out,sent:false}];
 }
 throw Error(`Unknown command '${cmd}'. Run help.`);
}
export function format(result){if(!Array.isArray(result))return JSON.stringify(result,null,2);const keys=[...new Set(result.flatMap(r=>Object.keys(r)))];return table(result,keys.map(key=>({key,label:key})));}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const result=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):format(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
