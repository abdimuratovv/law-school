import type { ServerAttempt } from './exams';
import type { StudentQuestion } from './questions';
export interface LearningSummary {completed:number;final:number;provisional:number;averagePercent:number|null;topics:Record<string,{correct:number;partial:number;incorrect:number;pending:number}>}
export interface ProgressResponse {summary:LearningSummary;window:number;backfillPending:boolean;items:{id:string;name:string;submittedAt:number;units:number;maxUnits:number;pending:number}[]}
export interface StudyItem {attemptId:string;question:StudentQuestion;answer:string;feedback:ServerAttempt['feedback'][string]}
export interface StudyPage {items:StudyItem[];next:string|null;window?:number}
