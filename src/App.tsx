import { NavLink, Route, Routes } from 'react-router-dom';
import CaseDetail from './pages/CaseDetail';
import Cases from './pages/Cases';
import Home from './pages/Home';
import Knowledge from './pages/Knowledge';
import Leads from './pages/Leads';
import Report from './pages/Report';
import Settings from './pages/Settings';
import Simulator from './pages/Simulator';
import Talk from './pages/Talk';

const NAV = [
  { to: '/', label: 'בית' },
  { to: '/cases', label: 'תיקים (בארי)' },
  { to: '/leads', label: 'לידים' },
  { to: '/knowledge', label: 'בסיס ידע' },
  { to: '/settings', label: 'הגדרות' },
];

export default function App() {
  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          Pillar <span>Diagnostic Agent</span>
        </NavLink>
        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/case/:id" element={<CaseDetail />} />
          <Route path="/case/:id/talk" element={<Talk />} />
          <Route path="/case/:id/simulator" element={<Simulator />} />
          <Route path="/case/:id/report" element={<Report />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <footer className="footer">Pillar Tech · אב-טיפוס · הכול רץ בדפדפן שלך</footer>
    </div>
  );
}
