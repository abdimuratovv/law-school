import type { Snapshot } from '../../shared/contracts/exams';
import type { SaveAnswersRequest } from '../../shared/contracts/api';

export interface Draft {
  key: string; revision: number; snapshot: Snapshot; dirty: boolean;
  pending?: { action: 'save' | 'submit' | 'check'; body: SaveAnswersRequest & { questionId?: string; deletedAnswerIds?: string[] }; snapshot?: Snapshot };
}
