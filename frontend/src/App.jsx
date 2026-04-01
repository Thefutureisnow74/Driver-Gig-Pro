import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import Companies from './Companies';
import JobHunter from './JobHunter';
import { Dashboard, Communications, Settings } from './pages';
import { C } from './theme';
import { supabase } from './supabaseClient';
import { supabaseSignIn, supabaseSignUp, supabaseSignOut, apiAuthMe, apiGetCompanies, apiGetActivities, apiGetHandlers, apiSeed } from './api';

function LoginScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setConfirmMsg('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await supabaseSignIn(email, password);
        // onAuthStateChange in App will handle the rest
      } else {
        const result = await supabaseSignUp(email, password, name);
        // Check if email confirmation is required
        if (result.user && !result.session) {
          setConfirmMsg('Account created! Please check your email to confirm, then sign in.');
          setMode('login');
        }
        // If session exists, onAuthStateChange will handle it
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    }
    setLoading(false);
  };

  const s = {
    wrap: { display: 'flex', height: '100vh', background: C.cream, fontFamily: "'Segoe UI', system-ui, sans-serif" },
    left: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 },
    right: { width: 480, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid #e8e2d8', padding: 48 },
    brand: { textAlign: 'center', maxWidth: 380 },
    logo: { width: 64, height: 64, borderRadius: 16, background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 auto 16px' },
    h1: { fontSize: 32, fontWeight: 800, color: C.navy, letterSpacing: '-.5px', marginBottom: 8 },
    sub: { fontSize: 14, color: '#888', lineHeight: 1.6 },
    form: { width: '100%', maxWidth: 340 },
    label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 },
    input: { width: '100%', padding: '11px 14px', border: '1.5px solid #e2ddd6', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: '#111', background: '#faf8f5', outline: 'none', boxSizing: 'border-box', marginBottom: 16 },
    btn: { width: '100%', padding: '12px 0', border: 'none', borderRadius: 8, background: C.navy, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1 },
    err: { background: '#fff5f5', border: '1px solid #ffcdd2', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#c62828', marginBottom: 16, textAlign: 'center' },
    success: { background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#2e7d32', marginBottom: 16, textAlign: 'center' },
    toggle: { textAlign: 'center', marginTop: 18, fontSize: 13, color: '#888' },
    link: { color: C.navy, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' },
  };

  return (
    <div data-testid="login-screen" style={s.wrap}>
      <div style={s.left}>
        <div style={s.brand}>
          <div style={s.logo}>DG</div>
          <div style={s.h1}>DriverGigsPro</div>
          <div style={s.sub}>Your Gig Empire. Organized.<br />Manage every delivery platform, contact, and follow-up in one professional CRM built for independent drivers.</div>
        </div>
      </div>
      <div style={s.right}>
        <form data-testid="auth-form" onSubmit={submit} style={s.form}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginBottom: 24 }}>{mode === 'login' ? 'Sign In' : 'Create Account'}</div>
          {error && <div data-testid="auth-error" style={s.err}>{error}</div>}
          {confirmMsg && <div data-testid="auth-confirm" style={s.success}>{confirmMsg}</div>}
          {mode === 'register' && (
            <>
              <label style={s.label}>Full Name</label>
              <input data-testid="auth-name" value={name} onChange={e => setName(e.target.value)} placeholder="King Solomon" style={s.input} required />
            </>
          )}
          <label style={s.label}>Email</label>
          <input data-testid="auth-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={s.input} required />
          <label style={s.label}>Password</label>
          <input data-testid="auth-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" style={s.input} required />
          <button data-testid="auth-submit" type="submit" style={s.btn} disabled={loading}>{loading ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create Account')}</button>
          <div style={s.toggle}>
            {mode === 'login' ? (
              <>Don't have an account? <span data-testid="auth-toggle" style={s.link} onClick={() => { setMode('register'); setError(''); setConfirmMsg(''); }}>Sign Up</span></>
            ) : (
              <>Already have an account? <span data-testid="auth-toggle" style={s.link} onClick={() => { setMode('login'); setError(''); setConfirmMsg(''); }}>Sign In</span></>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [authUser, setAuthUser]     = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage]             = useState('companies');
  const [companies, setCompanies]   = useState([]);
  const [activities, setActivities] = useState([]);
  const [handlers, setHandlers]     = useState(['Unassigned']);
  const [user, setUser]             = useState({
    name: '', email: '', firstName: '', lastName: '',
    username: '', dob: '', accountType: 'Free',
    goal: '', income: '', industries: [], vehicles: [], travelDistance: '', additionalInfo: '',
    phone: '', address: '', city: '', state: '', zip: '',
    licenseNumber: '', licenseState: '', licenseExpiry: '',
    medicalCard: false, medicalExpiry: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [comps, acts, hdlrs] = await Promise.all([
        apiGetCompanies(),
        apiGetActivities(),
        apiGetHandlers(),
      ]);
      setCompanies(comps);
      setActivities(acts);
      setHandlers(hdlrs);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }, []);

  const loadUserProfile = useCallback(async () => {
    try {
      const me = await apiAuthMe();
      setUser(prev => ({
        ...prev,
        name: me.name || '',
        email: me.email || '',
        firstName: me.name?.split(' ')[0] || '',
        lastName: me.name?.split(' ').slice(1).join(' ') || '',
      }));
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  }, []);

  // Listen for Supabase auth state changes
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        setAuthUser({ email: u.email, name: u.user_metadata?.full_name || u.email });
      }
      setAuthLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const u = session.user;
        setAuthUser({ email: u.email, name: u.user_metadata?.full_name || u.email });
      } else {
        setAuthUser(null);
        setCompanies([]);
        setActivities([]);
        setHandlers(['Unassigned']);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (authUser) {
      loadData();
      loadUserProfile();
    }
  }, [authUser, loadData, loadUserProfile]);

  const handleLogout = async () => {
    await supabaseSignOut();
    setAuthUser(null);
    setCompanies([]);
    setActivities([]);
    setHandlers(['Unassigned']);
  };

  const handleSeed = async () => {
    await apiSeed();
    await loadData();
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: C.cream, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 auto 12px' }}>DG</div>
          <div style={{ fontSize: 14, color: '#888' }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return <LoginScreen />;
  }

  const pageProps = { companies, setCompanies, activities, setActivities, handlers, setHandlers, user, setUser, setPage, loadData, onSeed: handleSeed, onLogout: handleLogout };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.cream, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar page={page} setPage={setPage} user={user} onLogout={handleLogout} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {page === 'dashboard'      && <Dashboard {...pageProps} />}
        {page === 'companies'      && <Companies {...pageProps} />}
        {page === 'communications' && <Communications {...pageProps} />}
        {page === 'jobhunter'      && <JobHunter {...pageProps} />}
        {page === 'settings'       && <Settings  {...pageProps} />}
      </div>
    </div>
  );
}
