import { NavLink, Route, Routes } from 'react-router-dom';
import CaseDetail from './pages/CaseDetail';
import Cases from './pages/Cases';
import Home from './pages/Home';
import Knowledge from './pages/Knowledge';

const NAV = [
  { to: '/', label: 'בית' },
  { to: '/cases', label: 'תיקים (בארי)' },
  { to: '/knowledge', label: 'בסיס ידע' },
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
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <footer className="footer">Pillar Tech · אב-טיפוס · הכול רץ בדפדפן שלך</footer>
    </div>
  );
}
