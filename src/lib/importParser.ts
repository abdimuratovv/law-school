import { read, utils } from 'xlsx';
import { Unzip, UnzipInflate, zipSync } from 'fflate';
import { canonicalImportContent, IMPORT_HEADERS, MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, type ImportRow } from '../../shared/contracts/imports';
import { privateQuestionSchema } from '../../shared/contracts/exams';

export interface ParsedImport {rows:ImportRow[];errors:string[];warnings:string[];duplicates:number;fileHash:string}
export function csvRows(text:string):string[][] {
 const rows:string[][]=[];let row:string[]=[];let cell='';let quoted=false;let closed=false;
 const field=()=>{row.push(cell);cell='';closed=false;};const line=()=>{field();rows.push(row);row=[];if(rows.length>MAX_IMPORT_ROWS+1)throw Error('At most 1000 data rows are allowed.');};
 for(let i=0;i<text.length;i++){
  const c=text[i]!;
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}
  else if(c===',')field();else if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;line();}
  else if(c==='"'&&!cell&&!closed)quoted=true;else{if(closed||c==='"')throw Error('Malformed quoted CSV field.');cell+=c;}
  if(row.length>IMPORT_HEADERS.length)throw Error('Too many columns.');
 }
 if(quoted)throw Error('Unclosed quoted CSV field.');if(cell||row.length||closed)line();return rows;
}
// Stream inflation before SheetJS: central-directory sizes are not a trustworthy expansion bound.
function boundedWorkbook(bytes:Uint8Array){
 const files:Record<string,Uint8Array>=Object.create(null) as Record<string,Uint8Array>;let expanded=0;let count=0;let failure:Error|undefined;
 const unzip=new Unzip(file=>{
  if(++count>128||file.name.includes('..')||file.name.startsWith('/')||/\\|vbaProject|embeddings\/|externalLinks\//i.test(file.name)||Object.prototype.hasOwnProperty.call(files,file.name)){failure=Error('Unsupported or unsafe workbook archive.');file.terminate();return;}
  const parts:Uint8Array[]=[];let size=0;files[file.name]=new Uint8Array();
  file.ondata=(error,data,final)=>{if(error){failure=error;return;}size+=data.length;expanded+=data.length;
   if(size>8*1024*1024||expanded>20*1024*1024){failure=Error('Workbook expansion exceeds the safety limit.');file.terminate();return;}
   parts.push(data);if(final){const out=new Uint8Array(size);let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length;}files[file.name]=out;}
  };file.start();
 });unzip.register(UnzipInflate);
 for(let i=0;i<bytes.length;i+=1024){unzip.push(bytes.subarray(i,i+1024),i+1024>=bytes.length);if(failure)throw failure;}
 if(!files['[Content_Types].xml'])throw Error('Expected an XLSX workbook.');return zipSync(files,{level:0});
}
export async function parseImport(bytes:Uint8Array,filename:string):Promise<ParsedImport>{
 if(!bytes.length||bytes.length>MAX_IMPORT_BYTES)throw Error('The file must be between 1 byte and 5 MB.');
 let table:string[][];
 if(/\.csv$/i.test(filename))table=csvRows(new TextDecoder('utf-8',{fatal:true,ignoreBOM:false}).decode(bytes).replace(/^\uFEFF/,''));
 else if(/\.xlsx$/i.test(filename)){
  const book=read(boundedWorkbook(bytes),{type:'array',sheetRows:MAX_IMPORT_ROWS+2,cellFormula:true});
  if(book.SheetNames.length!==1)throw Error('Use exactly one worksheet.');const sheet=book.Sheets[book.SheetNames[0]!]!;
  const range=utils.decode_range(sheet['!fullref']??sheet['!ref']??'A1');
  if(range.e.r>MAX_IMPORT_ROWS||range.e.c>=IMPORT_HEADERS.length)throw Error('Workbook exceeds 1000 rows or the template columns.');
  for(const [key,cell] of Object.entries(sheet))if(!key.startsWith('!')&&cell&&typeof cell==='object'&&'f' in cell)throw Error('Formula cells are not allowed.');
  table=utils.sheet_to_json<string[]>(sheet,{header:1,defval:'',raw:false,range:{s:{r:0,c:0},e:{r:range.e.r,c:IMPORT_HEADERS.length-1}},blankrows:true});
 }else throw Error('Choose a CSV or XLSX file.');
 const headers=(table.shift()??[]).map(s=>String(s).trim());
 if(headers.length!==IMPORT_HEADERS.length||headers.some((s,i)=>s!==IMPORT_HEADERS[i]))throw Error('Headers must match the CSV template exactly.');
 if(!table.length||table.length>MAX_IMPORT_ROWS)throw Error('Use 1 to 1000 data rows.');
 const rows:ImportRow[]=[];const errors:string[]=[];const warnings:string[]=[];const seen=new Set<string>();let duplicates=0;let size=0;
 table.forEach((cells,i)=>{try{
  if(cells.length>headers.length)throw Error('Too many columns.');const values=Object.fromEntries(headers.map((key,n)=>[key,String(cells[n]??'').trim()]));
  if(Object.values(values).some(v=>/^[=+@]/.test(v)))throw Error('Formula-like cells are not allowed.');
  const list=(value:string)=>value?value.split('|').map((t,k)=>({k:String(k+1),t})):undefined;
  const content=canonicalImportContent({kind:values.kind,topic:values.topic,stem:values.stem,options:['A','B','C','D'].map((key,n)=>({id:'o'+(n+1),text:values[key]})),correctOptionId:values.correct?'o'+('ABCD'.indexOf(values.correct!)+1):null,accepted:values.accepted?values.accepted.split('|'):[],explanation:values.explanation,terms:list(values.terms!),defs:list(values.defs!),...(values.legal_url||values.legal_label?{legal:{label:values.legal_label,url:values.legal_url}}:{})});
  privateQuestionSchema.parse({question:{id:'import',kind:content.kind,topic:content.topic,stem:content.stem,...(content.kind==='single'?{options:content.options,terms:content.terms,defs:content.defs}:{}),legal:content.legal},correctOptionId:content.kind==='single'?content.correctOptionId:undefined,accepted:content.kind==='written'?content.accepted:[],explanation:content.explanation});
  if(!content.stem||content.kind==='single'&&!/^[ABCD]$/.test(values.correct!))throw Error('Enter question text and a valid correct choice.');
  const canonical=JSON.stringify(content);size+=new TextEncoder().encode(canonical).length;
  if(new TextEncoder().encode(JSON.stringify({rows:[{rowNumber:i+2,content}]})).length>192*1024)throw Error('This row is too large to upload.');
  if(seen.has(canonical))duplicates++;seen.add(canonical);rows.push({rowNumber:i+2,content});
  if(content.kind==='written'&&!content.accepted.length)warnings.push(`Row ${i+2}: teacher review will be required.`);
 }catch(error){errors.push(`Row ${i+2}: ${error instanceof Error?error.message:'Invalid row'}`);}});
 if(size>MAX_IMPORT_BYTES)errors.push('Canonical import data exceeds 5 MB.');
 const fileHash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer as ArrayBuffer))].map(v=>v.toString(16).padStart(2,'0')).join('');
 return {rows,errors,warnings,duplicates,fileHash};
}

export { IMPORT_HEADERS } from '../../shared/contracts/imports';
