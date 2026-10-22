import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import { AppStateProvider } from './state/AppState';
import { AuthProvider } from './state/AuthState';
import { LanguageProvider } from './i18n/LanguageProvider';
import './styles/hm.css';
import './styles/app.css';

const router = createBrowserRouter([{ path: '*', element: <App /> }]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider><AppStateProvider>
        <RouterProvider router={router} />
      </AppStateProvider></AuthProvider>
    </LanguageProvider>
  </StrictMode>
);
