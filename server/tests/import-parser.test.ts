import { describe,expect,it } from 'vitest';
import { utils,write } from 'xlsx';
import { zipSync,strToU8 } from 'fflate';
import { csvRows,parseImport,IMPORT_HEADERS } from '../../src/lib/importParser';
const row=['written','theory','Synthetic question','','','','','','example','Explanation','','','',''];
const bytes=(text:string)=>new TextEncoder().encode(text);
function workbook(table:string[][],formula=false){const book=utils.book_new();const sheet=utils.aoa_to_sheet(table);if(formula)sheet.C2={t:'s',v:'Synthetic question',f:'A1'};utils.book_append_sheet(book,sheet,'Questions');return new Uint8Array(write(book,{type:'array',bookType:'xlsx'}));}
describe('actual bounded CSV/XLSX parsing',()=>{
 it('reads quoted delimiters, escaped quotes, BOM and multiline UTF-8 text',async()=>{
  expect(csvRows('a,"b,b","c""d"\r\n"e\nf",g,h')).toEqual([['a','b,b','c"d'],['e\nf','g','h']]);
  const parsed=await parseImport(bytes('\ufeff'+IMPORT_HEADERS.join(',')+'\n'+row.join(',')),'x.csv');expect(parsed.errors).toEqual([]);expect(parsed.rows[0]?.content.accepted).toEqual(['example']);expect(parsed.fileHash).toHaveLength(64);
 });
 it('rejects malformed CSV and XLS, oversized source files and extra rows',async()=>{
  expect(()=>csvRows('"unclosed')).toThrow();expect(()=>csvRows('"closed"bad')).toThrow();expect(()=>csvRows('a,b\n'.repeat(1002))).toThrow();
  await expect(parseImport(bytes('old'),'x.xls')).rejects.toThrow();await expect(parseImport(new Uint8Array(5242881),'x.csv')).rejects.toThrow();
 });
 it('rejects duplicate/prototype/unknown headers rather than mapping silently',async()=>{
  for(const header of ['__proto__','stem','unknown'])await expect(parseImport(bytes([header,...IMPORT_HEADERS.slice(1)].join(',')+'\n'+row.join(',')),'x.csv')).rejects.toThrow('Headers');
 });
 it('reports invalid rows, detects canonical duplicates and marks manual-only answers',async()=>{
  const parsed=await parseImport(bytes(IMPORT_HEADERS.join(',')+'\n'+row.join(',')+'\n'+row.join(',')+'\n'+['written','theory','=formula','','','','','','',''].join(',')),'x.csv');
  expect(parsed.rows).toHaveLength(2);expect(parsed.duplicates).toBe(1);expect(parsed.errors).toHaveLength(1);
  const manual=[...row];manual[8]='';const warning=await parseImport(bytes(IMPORT_HEADERS.join(',')+'\n'+manual.join(',')),'x.csv');expect(warning.warnings).toHaveLength(1);
 });
 it('reads an actual XLSX worksheet into the same canonical question',async()=>{
  const csv=await parseImport(bytes(IMPORT_HEADERS.join(',')+'\n'+row.join(',')),'x.csv');const xlsx=await parseImport(workbook([IMPORT_HEADERS,row]),'x.xlsx');expect(xlsx.rows).toEqual(csv.rows);expect(xlsx.errors).toEqual([]);
 });
 it('rejects XLSX formulas and forged/expanding archives before canonical parsing',async()=>{
  await expect(parseImport(workbook([IMPORT_HEADERS,row],true),'x.xlsx')).rejects.toThrow('Formula');
  const bad=zipSync({'../escape':strToU8('no')});await expect(parseImport(bad,'x.xlsx')).rejects.toThrow();
  const bomb=zipSync({'[Content_Types].xml':new Uint8Array(9*1024*1024)});await expect(parseImport(bomb,'x.xlsx')).rejects.toThrow('expansion');
 });
});
