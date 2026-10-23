import { parseImport } from './importParser';
const scope=self as unknown as {onmessage:((event:MessageEvent<{bytes:ArrayBuffer;filename:string}>)=>void)|null;postMessage:(data:unknown)=>void};
scope.onmessage=event=>{void parseImport(new Uint8Array(event.data.bytes),event.data.filename).then(result=>scope.postMessage({result})).catch(error=>scope.postMessage({error:error instanceof Error?error.message:'Could not read the file.'}));};
