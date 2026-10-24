import { Navigate,Route, Routes } from 'react-router-dom';
import { AdminShell } from '@/components/layout/AdminShell';
import { ServerBank as Bank,ServerEditor as Editor } from './ServerTeaching';
import Collections from './Collections';
import CollectionEditor from './CollectionEditor';
import CollectionResults from './CollectionResults';
import RegisteredUsers from './RegisteredUsers';
import ServerImport from './ServerImport';
import { RouteUnavailable } from '@/components/layout/RouteAccess';
import { ServerProfile } from '@/pages/student/ServerExams';

export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route index element={<Collections />} />
        <Route path="bank" element={<Bank />} />
        <Route path="editor/:id?" element={<Editor />} />
        <Route path="import" element={<ServerImport />} />
        <Route path="builder" element={<CollectionEditor />} />
        <Route path="grading" element={<Navigate to="/admin/results?review=1" replace />} />
        <Route path="students" element={<RegisteredUsers />} />
        <Route path="analytics" element={<Navigate to="/admin/results" replace />} />
        <Route path="results" element={<CollectionResults />} />
        <Route path="profile" element={<ServerProfile embedded />} />
        <Route path="*" element={<RouteUnavailable teacher embedded />} />
      </Route>
    </Routes>
  );
}
