import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './config/theme.css';
import './config/history.css';
import './config/calendar.css';
import './config/reports.css';
import './config/products.css';
import './config/settings.css';
import './config/auth.css';
import './config/profit.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
