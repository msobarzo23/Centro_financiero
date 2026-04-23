import React from 'react';
import ReactDOM from 'react-dom/client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import App from './App.jsx';
import { queryClient, localStoragePersister } from './queryClient.js';

const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // Cache en localStorage: 24h

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: localStoragePersister, maxAge: CACHE_MAX_AGE }}
    >
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>,
);
