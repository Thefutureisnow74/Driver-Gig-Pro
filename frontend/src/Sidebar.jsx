import React from 'react';
import { C } from './theme';

const NAV_ITEMS = [
  { id: 'dashboard',      label: 'Dashboard',      icon: '⊞' },
  { id: 'companies',      label: 'Companies',       icon: '💼' },
  { id: 'communications', label: 'Communications',  icon: '🕐' },
  { id: 'jobhunter',      label: 'Job Hunter',      icon: '⊛', badge: 'NEW' },
  { id: 'settings',       label: 'Settings',        icon: '⚙'  },
];

export default function Sidebar({ page, setPage, user }) {
  const s = {
    sidebar: { width: 260, minWidth: 260, background: C.navy, display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 },
    logo: { padding: '20px 18px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,.1)' },
    logoMark: { width: 42, height: 42, background: '#2e75b6', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0 },
    logoName: { fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.2 },
    logoTag: { fontSize: 10, color: 'rgba(255,255,255,.55)', marginTop: 1 },
    nav: { flex: 1, padding: '12px 10px', overflowY: 'auto' },
    navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', color: active ? '#fff' : 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: active ? 700 : 500, marginBottom: 2, background: active ? '#2e4080' : 'transparent', transition: 'all .15s', userSelect: 'none' }),
    navIcon: { fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 },
    userRow: { padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', gap: 10 },
    userAva: { width: 34, height: 34, borderRadius: '50%', background: '#2e75b6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 },
    userName: { fontSize: 12, fontWeight: 700, color: '#fff' },
    userEmail: { fontSize: 10, color: 'rgba(255,255,255,.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    logoutBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: 12, padding: '4px 8px', borderRadius: 5 },
  };

  const initials = (name) => name ? name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() : 'KS';

  return (
    <div style={s.sidebar}>
      <div style={s.logo}>
        <div style={s.logoMark}>DG</div>
        <div>
          <div style={s.logoName}>DriverGigsPro</div>
          <div style={s.logoTag}>Your Gig Empire. Organized.</div>
        </div>
      </div>

      <div style={s.nav}>
        {NAV_ITEMS.map(item => (
          <div
            key={item.id}
            style={s.navItem(page === item.id)}
            onClick={() => setPage(item.id)}
            onMouseEnter={e => { if (page !== item.id) e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { if (page !== item.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.7)'; } }}
          >
            <span style={s.navIcon}>{item.icon}</span>
            {item.label}
            {item.badge && (
              <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 800, letterSpacing: '.3px', background: 'linear-gradient(135deg, #e8a030, #f0c060)', color: '#fff' }}>
                {item.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      <div style={s.userRow}>
        <div style={s.userAva}>{initials(user?.name || 'King Solomon')}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={s.userName}>{user?.name || 'King Solomon'}</div>
          <div style={s.userEmail}>{user?.email || 'cfmbusiness@gmail.com'}</div>
        </div>
        <button style={s.logoutBtn}>→</button>
      </div>
    </div>
  );
}
