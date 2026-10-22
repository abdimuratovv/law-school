import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import { AppStateProvider } from './state/AppState';
import { LanguageProvider } from './i18n/LanguageProvider';
import './styles/hm.css';
import './styles/app.css';

const router = createBrowserRouter([{ path: '*', element: <App /> }]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <AppStateProvider>
        <RouterProvider router={router} />
      </AppStateProvider>
    </LanguageProvider>
  </StrictMode>
);
