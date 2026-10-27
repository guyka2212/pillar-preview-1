import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Hash routing so a page refresh on GitHub Pages never hits a 404. */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
