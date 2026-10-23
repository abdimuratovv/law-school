import { Route, Routes } from 'react-router-dom';
import { AdminShell } from '@/components/layout/AdminShell';
import { ServerBank as Bank,ServerBuilder as Builder,ServerEditor as Editor,ServerGrading as Grading,ServerOverview as Overview,ServerGroups,TeacherPending } from './ServerTeaching';
import { RouteUnavailable } from '@/components/layout/RouteAccess';

export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route index element={<Overview />} />
        <Route path="bank" element={<Bank />} />
        <Route path="editor/:id?" element={<Editor />} />
        <Route path="import" element={<TeacherPending />} />
        <Route path="builder" element={<Builder />} />
        <Route path="grading" element={<Grading />} />
        <Route path="students" element={<ServerGroups />} />
        <Route path="analytics" element={<TeacherPending />} />
        <Route path="*" element={<RouteUnavailable teacher embedded />} />
      </Route>
    </Routes>
  );
}
