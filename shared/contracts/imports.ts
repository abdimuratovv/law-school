import { z } from 'zod';
import { questionDraftContentSchema } from './teaching';
export const MAX_IMPORT_BYTES=5*1024*1024;
export const MAX_IMPORT_ROWS=1000;
export const IMPORT_CHUNK_ROWS=25;
export const importJobSchema=z.strictObject({
  operationId:z.uuid(),filename:z.string().min(1).max(200).regex(/\.(csv|xlsx)$/i),bytes:z.number().int().min(1).max(MAX_IMPORT_BYTES),
  totalRows:z.number().int().min(1).max(MAX_IMPORT_ROWS),fileHash:z.string().regex(/^[a-f0-9]{64}$/),duplicatePolicy:z.enum(['skip','keep']),
});
export const importRowSchema=z.strictObject({rowNumber:z.number().int().min(2).max(MAX_IMPORT_ROWS+1),content:questionDraftContentSchema});
export type ImportRow=z.infer<typeof importRowSchema>;
export const importChunkSchema=z.strictObject({rows:z.array(importRowSchema).min(1).max(IMPORT_CHUNK_ROWS)}).refine(body=>new Set(body.rows.map(row=>row.rowNumber)).size===body.rows.length);
export const importCommitSchema=z.strictObject({cursor:z.number().int().min(1).max(MAX_IMPORT_ROWS+1)});
export interface ImportJob {id:string;filename:string;fileHash?:string;status:'uploading'|'ready'|'committing'|'complete';totalRows:number;uploadedRows:number;cursor:number;created:number;skipped:number;duplicatePolicy:'skip'|'keep';payloadBytes:number}
export function canonicalImportContent(input:unknown){
  const normalized=JSON.parse(JSON.stringify(input,(_key,value:unknown)=>typeof value==='string'?value.normalize('NFC').trim():value)) as unknown;
  return questionDraftContentSchema.parse(normalized);
}

export const IMPORT_HEADERS=['kind','topic','stem','A','B','C','D','correct','accepted','explanation','terms','defs','legal_label','legal_url'];
export const IMPORT_TEMPLATE=IMPORT_HEADERS.join(',')+'\nwritten,theory,Example question,,,,,,example|alternative,Explanation,,,,\n';
