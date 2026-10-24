/** Safe HTTP diagnostics shared by browser transport and import orchestration. */
export class ExamError extends Error {
  constructor(public status:number,message:string){super(message);}
}
export class TeachingRequestError extends ExamError {
  constructor(status:number,public requestId:string|null,public retryAfterMs:number,public fields:string[]){super(status,'The request could not be completed.');}
}
