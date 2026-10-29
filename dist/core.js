/* RunDelta: original independent metadata comparison utility. MIT. */
export const VERSION = '0.1.0';
export const LIMITS = Object.freeze({bytes:250000, rows:1000, cell:10000});
export const FIELDS = ['parameter','value','unit','notes'];
export function parseCSV(text) {
  if(typeof text !== 'string') throw new Error('CSV input must be text.');
  if(text.startsWith('\uFEFF')) text=text.slice(1);
  if(text.includes('\0')) throw new Error('NUL characters are not supported.');
  const rows=[]; let row=[],cell='', quoted=false,closed=false,started=false;
  const field=()=>{if(cell.length>LIMITS.cell) throw new Error('A field exceeds 10,000 characters.');row.push(cell);cell='';closed=false;started=false;};
  const record=()=>{field();rows.push(row);row=[];if(rows.length>LIMITS.rows+1) throw new Error('Maximum 1,000 data rows per file.');};
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
    if(c===','){field();continue;}
    if(c==='\r'||c==='\n'){record();if(c==='\r'&&text[i+1]==='\n')i++;continue;}
    if(closed) throw new Error('Unexpected character after a closing quote.');
    if(c==='"'){if(started)throw new Error('Quotes must begin a field.');quoted=true;started=true;}else{cell+=c;started=true;}
  }
  if(quoted)throw new Error('Unclosed quoted field.');
  if(started||closed||cell||row.length)record();
  return rows;
}
export function inspect(text){
  let records;
  try{records=parseCSV(text);}catch(error){return {ok:false,rows:[],findings:[{code:'CSV_SYNTAX',message:error.message}]};}
  const findings=[];const rows=[];
  if(!records.length||records[0].length!==4||records[0].some((v,i)=>v!==FIELDS[i])) return {ok:false,rows:[],findings:[{code:'HEADER',message:'Use the exact header: parameter,value,unit,notes'}]};
  if(records.length===1)findings.push({code:'EMPTY',message:'At least one data row is required.'});
  const seen=new Map();
  records.slice(1).forEach((r,i)=>{
    const line=i+2;
    if(r.length!==4){findings.push({code:'WIDTH',row:line,message:'Each record must have exactly four fields.'});return;}
    const entry=Object.fromEntries(FIELDS.map((f,j)=>[f,r[j]]));
    if(!entry.parameter.trim()) findings.push({code:'KEY',row:line,message:'Parameter must not be empty or whitespace only.'});
    else if(seen.has(entry.parameter))findings.push({code:'DUPLICATE',row:line,message:`Duplicate parameter; first seen in record ${seen.get(entry.parameter)}.`});
    else seen.set(entry.parameter,line);
    rows.push(entry);
  });
  return {ok:findings.length===0,rows,findings};
}
export async function snapshot(bytes,name='snapshot.csv'){
  if(!(bytes instanceof Uint8Array))throw new Error('Expected file bytes.');
  if(bytes.byteLength>LIMITS.bytes)throw new Error('File exceeds 250,000 bytes.');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  const result=inspect(text);
  const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return {...result,source:{name,bytes:bytes.byteLength,sha256:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')},original:bytes.slice()};
}
export function compare(before,after){
  if(!before.ok||!after.ok)throw new Error('Both snapshots must pass the schema review.');
  const a=new Map(before.rows.map(r=>[r.parameter,r])),b=new Map(after.rows.map(r=>[r.parameter,r]));
  const keys=[...new Set([...a.keys(),...b.keys()])].sort();
  const entries=keys.map(parameter=>{
    const left=a.get(parameter)||null,right=b.get(parameter)||null;
    const changedFields=left&&right?FIELDS.slice(1).filter(k=>left[k]!==right[k]):[];
    return {parameter,status:!left?'added':!right?'removed':changedFields.length?'changed':'unchanged',changedFields,unitMismatch:Boolean(left&&right&&left.unit!==right.unit),before:left,after:right};
  });
  const counts={added:0,removed:0,changed:0,unchanged:0,unitMismatches:0};
  for(const e of entries){counts[e.status]++;if(e.unitMismatch)counts.unitMismatches++;}
  return {tool:'RunDelta',version:VERSION,comparison:'exact-text; case-sensitive; no trimming, numerical interpretation, or unit conversion',sources:{before:before.source,after:after.source},counts,entries};
}
export function reportJSON(report){return JSON.stringify(report,null,2)+'\n';}
export function safeCell(value){const s=String(value??'');return /^[\s\u0000-\u001f]*[=+\-@]/u.test(s)||/^[\t\r\n]/u.test(s)?"'"+s:s;}
export function reportCSV(report){
  const header=['parameter','status','changed_fields','unit_mismatch','before_present','before_value','before_unit','before_notes','after_present','after_value','after_unit','after_notes'];
  const records=report.entries.map(e=>[e.parameter,e.status,e.changedFields.join(';'),e.unitMismatch,e.before!==null,e.before?.value??'',e.before?.unit??'',e.before?.notes??'',e.after!==null,e.after?.value??'',e.after?.unit??'',e.after?.notes??'']);
  return [header,...records].map(row=>row.map(v=>'"'+safeCell(v).replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';
}
