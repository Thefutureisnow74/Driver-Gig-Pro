import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Companies from './Companies';
import JobHunter from './JobHunter';
import { Dashboard, Communications, Settings } from './pages';
import { INITIAL_COMPANIES, INITIAL_ACTIVITIES, INITIAL_HANDLERS } from './mockData';
import { C } from './theme';

export default function App() {
  const [page, setPage]           = useState('companies');
  const [companies, setCompanies] = useState(INITIAL_COMPANIES);
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [handlers, setHandlers]   = useState(INITIAL_HANDLERS);
  const [user, setUser]           = useState({
    name: 'King Solomon', email: 'cfmbusiness@gmail.com', firstName: 'King', lastName: 'Solomon',
    username: 'cfmbusiness', dob: '', accountType: 'Lifetime User',
    goal: '', income: '', industries: [], vehicles: [], travelDistance: '', additionalInfo: '',
    phone: '', address: '', city: '', state: '', zip: '',
    licenseNumber: '', licenseState: '', licenseExpiry: '',
    medicalCard: false, medicalExpiry: '',
  });

  const pageProps = { companies, setCompanies, activities, setActivities, handlers, setHandlers, user, setUser, setPage };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.cream, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar page={page} setPage={setPage} user={user} />
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
