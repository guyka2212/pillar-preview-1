import { NavLink, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';

const NAV = [{ to: '/', label: 'בית' }];

export default function App() {
  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          Pillar <span>Diagnostic Agent</span>
        </NavLink>
        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <footer className="footer">Pillar Tech · אב-טיפוס · הכול רץ בדפדפן שלך</footer>
    </div>
  );
}
