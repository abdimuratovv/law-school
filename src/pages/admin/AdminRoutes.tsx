import { Route, Routes } from 'react-router-dom';
import { AdminShell } from '@/components/layout/AdminShell';
import Analytics from './Analytics';
import Bank from './Bank';
import Builder from './Builder';
import Editor from './Editor';
import Grading from './Grading';
import Import from './Import';
import Overview from './Overview';
import Students from './Students';
import { RouteUnavailable } from '@/components/layout/RouteAccess';

export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route index element={<Overview />} />
        <Route path="bank" element={<Bank />} />
        <Route path="editor/:id?" element={<Editor />} />
        <Route path="import" element={<Import />} />
        <Route path="builder" element={<Builder />} />
        <Route path="grading" element={<Grading />} />
        <Route path="students" element={<Students />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="*" element={<RouteUnavailable teacher embedded />} />
      </Route>
    </Routes>
  );
}
