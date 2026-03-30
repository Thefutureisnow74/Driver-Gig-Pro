import React, { useState } from 'react';
import { C, STATUSES, LOG_OUTCOMES } from './theme';
import { StatusBadge, PriorityBadge, Card, BtnPrimary, BtnSecondary } from './components';
import HandlerCombobox from './HandlerCombobox';
import CompanyCard from './CompanyCard';

// ── DASHBOARD ─────────────────────────────────────────────────────────
export function Dashboard({ companies, activities, setPage, setCompanies }) {
  const total     = companies.length;
  const offered   = companies.filter(c => c.status === 'Offered').length;
  const active    = companies.filter(c => c.status === 'Active').length;
  const overdue   = companies.filter(c => c.status === 'Overdue');
  const today     = new Date().toISOString().split('T')[0];
  const followDue = companies.filter(c => c.followUp && c.followUp <= today);
  const scheduled = companies.filter(c => c.followUp === today);

  // Find last activity date per company
  const lastActivity = {};
  activities.forEach(a => {
    if (!lastActivity[a.companyId] || a.date > lastActivity[a.companyId]) lastActivity[a.companyId] = a.date;
    if (!lastActivity[a.companyName] || a.date > lastActivity[a.companyName]) lastActivity[a.companyName] = a.date;
  });

  const initials = (name) => name ? name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() : '??';

  return (
    <div data-testid="dashboard-page" style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:C.cream }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <div style={{ fontSize:28, fontWeight:700, color:C.navy, letterSpacing:'-.3px' }}>Dashboard</div>
          <div style={{ fontSize:13, color:'#888', marginTop:3 }}>Overview of your gig portfolio</div>
        </div>
        <BtnPrimary onClick={() => setPage('communications')}>Compose</BtnPrimary>
      </div>

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        <div style={{ background:'#e8f5e9', border:'1px solid #c8e6c9', borderRadius:12, padding:'18px 20px', cursor:'pointer' }} onClick={() => setPage('companies')}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'#2e7d32', marginBottom:10 }}>Total Companies</div>
          <div style={{ fontSize:36, fontWeight:700, color:'#1b5e20', lineHeight:1 }}>{total}</div>
          <div style={{ fontSize:11, color:'#558b2f', marginTop:6 }}>Companies tracked</div>
        </div>
        <div style={{ background:'#e3f2fd', border:'1px solid #bbdefb', borderRadius:12, padding:'18px 20px', cursor:'pointer' }} onClick={() => setPage('companies')}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'#1565c0', marginBottom:10 }}>Follow-ups Due</div>
          <div style={{ fontSize:36, fontWeight:700, color:'#0d47a1', lineHeight:1 }}>{followDue.length}</div>
          <div style={{ fontSize:11, color:'#1976d2', marginTop:6 }}>Don't let these go cold</div>
        </div>
        <div style={{ background:'#e8f5e9', border:'1px solid #c8e6c9', borderRadius:12, padding:'18px 20px', cursor:'pointer' }} onClick={() => setPage('companies')}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'#2e7d32', marginBottom:10 }}>Offers & Active</div>
          <div style={{ fontSize:36, fontWeight:700, color:'#1b5e20', lineHeight:1 }}>{offered + active}</div>
          <div style={{ fontSize:11, color:'#558b2f', marginTop:6 }}>{active} active · {offered} offered</div>
        </div>
        <div style={{ background:'#fff8e1', border:'1px solid #ffe082', borderRadius:12, padding:'18px 20px', cursor:'pointer' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'#f57f17', marginBottom:10 }}>Scheduled Today</div>
          <div style={{ fontSize:36, fontWeight:700, color:'#e65100', lineHeight:1 }}>{scheduled.length}</div>
          <div style={{ fontSize:11, color:'#ff8f00', marginTop:6 }}>Contacts due today</div>
        </div>
      </div>

      {/* OVERDUE Section */}
      {overdue.length > 0 && (
        <div style={{ background:'#fff5f5', border:'1.5px solid #ffcdd2', borderRadius:12, padding:'18px 22px', marginBottom:24 }}>
          <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'#c62828', marginBottom:14 }}>⚠ Overdue — Do These First</div>
          {overdue.map(co => (
            <div key={co.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #ffebee', cursor:'pointer' }} onClick={() => setPage('companies')}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontWeight:700, color:'#333', fontSize:13 }}>{co.name}</span>
                <span style={{ fontSize:11, color:'#888' }}>{co.contactName}</span>
                <span style={{ fontSize:11, color:'#c62828' }}>Last: {lastActivity[co.id] || lastActivity[co.name] || co.lastModified || '—'}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:'#ffcdd2', color:'#c62828', border:'1px solid #ef9a9a' }}>OVERDUE</span>
                <span style={{ fontSize:12, color:'#666' }}>{co.handler}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ALL OPPORTUNITIES Table */}
      <div style={{ background:'#fff', border:'1px solid #e2ddd6', borderRadius:12, overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #e8e2d8' }}>
          <div style={{ fontSize:14, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:C.navy }}>All Opportunities</div>
          <BtnPrimary onClick={() => setPage('companies')}>+ Add Company</BtnPrimary>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr>
              {['Company','Contact','Type','Vehicle','Handler','Status','Priority'].map(h => (
                <th key={h} style={{ background:'#f0f4f9', padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'.5px', borderBottom:'1px solid #e8e2d8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 ? (
              <tr><td colSpan={7} style={{ padding:30, textAlign:'center', color:'#bbb', fontStyle:'italic' }}>No companies yet — add one to get started</td></tr>
            ) : (
              companies.map((co, i) => {
                const isOverdue = co.status === 'Overdue';
                return (
                  <tr key={co.id} style={{ borderBottom:'1px solid #f0ece4', background: i%2===1?'#faf8f5':'#fff', cursor:'pointer' }}
                    onClick={() => setPage('companies')}
                  >
                    <td style={{ padding:'12px 14px', verticalAlign:'middle' }}>
                      <div style={{ fontWeight:700, color:C.navy, fontSize:13 }}>{co.name}</div>
                      {isOverdue && <span style={{ display:'inline-block', marginTop:3, padding:'2px 8px', borderRadius:20, fontSize:9, fontWeight:700, background:'#ffcdd2', color:'#c62828', border:'1px solid #ef9a9a' }}>OVERDUE</span>}
                    </td>
                    <td style={{ padding:'12px 14px', verticalAlign:'middle' }}>
                      <div style={{ fontWeight:600, color:'#333', fontSize:12 }}>{co.contactName || '—'}</div>
                      <div style={{ fontSize:10, color:'#aaa' }}>{co.contactTitle || ''}</div>
                    </td>
                    <td style={{ padding:'12px 14px', verticalAlign:'middle' }}>
                      <span style={{ padding:'3px 9px', background:'#f0f4f9', border:'1px solid #dde3ed', borderRadius:20, fontSize:11, color:'#555' }}>{co.serviceType?.[0] || '—'}</span>
                    </td>
                    <td style={{ padding:'12px 14px', verticalAlign:'middle', fontSize:12, color:'#555' }}>
                      {co.vehicles?.[0] || '—'}
                    </td>
                    <td style={{ padding:'12px 14px', verticalAlign:'middle' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ width:22, height:22, borderRadius:'50%', background:C.navy, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, color:'#fff', flexShrink:0 }}>{initials(co.handler)}</div>
                        <span style={{ fontSize:12, color:'#333' }}>{co.handler || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding:'12px 14px', verticalAlign:'middle' }}><StatusBadge status={co.status} /></td>
                    <td style={{ padding:'12px 14px', verticalAlign:'middle' }}><PriorityBadge priority={co.priority} /></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── COMMUNICATIONS (replaces Activity Log + Email Manager) ─────────────
export function Communications({ companies, setCompanies, activities, setActivities, handlers, setHandlers, user }) {
  const [filter, setFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState(null); // { id, name } or null
  const [composeMode, setComposeMode] = useState(null); // null | 'activity' | 'email'
  const [selected, setSelected] = useState(null);
  const [noteOpen, setNoteOpen] = useState(null); // activity id or null

  // Activity form
  const [actForm, setActForm] = useState({ companyId: '', companyName: '', type: 'Phone', outcome: 'Interested', handler: (handlers && handlers[0]) || '', notes: '', nextAction: '' });
  // Email form
  const [emailForm, setEmailForm] = useState({ companyId: '', companyName: '', contactEmail: '', subject: '', body: '', direction: 'Sent', replyBy: '' });

  const rows = activities.filter(a => {
    if (companyFilter && (a.companyId !== companyFilter.id && a.companyName !== companyFilter.name)) return false;
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (a.companyName || '').toLowerCase().includes(q) || (a.type || '').toLowerCase().includes(q) || (a.notes || '').toLowerCase().includes(q) || (a.subject || '').toLowerCase().includes(q);
  });

  const DOT = { Phone:'#3d9a5c', Email:'#1565c0', Meeting:'#7b1fa2', Note:'#f59e0b' };

  const OUTCOME_BADGE = {
    Interested: { bg:'#d4eddb', c:'#1a5c2a' }, Pending: { bg:'#fef6d0', c:'#7a5000' },
    Callback: { bg:'#e3f2fd', c:'#1565c0' }, 'Left Voicemail': { bg:'#f3e5f5', c:'#6a1b9a' },
    'No Answer': { bg:'#f5f5f5', c:'#666' }, Declined: { bg:'#ffcdd2', c:'#c62828' },
    'Awaiting Reply': { bg:'#fff8e1', c:'#f57f17' }, Sent: { bg:'#e3f2fd', c:'#1565c0' },
    Received: { bg:'#e8f5e9', c:'#2e7d32' }, Resolved: { bg:'#e8f5e9', c:'#2e7d32' },
  };

  const lbl = { display:'block', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.6px', color:'#888', marginBottom:4 };
  const inp = { width:'100%', padding:'8px 10px', border:'1.5px solid #ddd', borderRadius:7, fontSize:12, fontFamily:'inherit', background:'#fff', color:'#111', outline:'none', boxSizing:'border-box' };

  const selectCompanyAct = (id) => {
    const co = companies.find(c => c.id === id);
    setActForm(f => ({ ...f, companyId: id, companyName: co?.name || '' }));
  };
  const selectCompanyEmail = (id) => {
    const co = companies.find(c => c.id === id);
    setEmailForm(f => ({ ...f, companyId: id, companyName: co?.name || '', contactEmail: co?.contactEmail || '' }));
  };

  const saveActivity = () => {
    if (!actForm.companyId) { alert('Select a company'); return; }
    if (!actForm.notes.trim()) { alert('Add notes'); return; }
    const now = new Date();
    const entry = {
      ...actForm,
      id: 'a' + Date.now(),
      dateTime: now.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) + ' at ' + now.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' }),
      date: now.toISOString().split('T')[0],
    };
    setActivities(prev => [entry, ...prev]);
    setActForm({ companyId: '', companyName: '', type: 'Phone', outcome: 'Interested', handler: (handlers && handlers[0]) || '', notes: '', nextAction: '' });
    setComposeMode(null);
  };

  const saveEmail = () => {
    if (!emailForm.companyId || !emailForm.subject.trim()) { alert('Company and subject required'); return; }
    const now = new Date();
    const entry = {
      ...emailForm,
      id: 'em' + Date.now(),
      type: 'Email',
      outcome: emailForm.direction,
      status: emailForm.direction === 'Sent' ? 'Awaiting Reply' : 'Received',
      handler: user?.name || '',
      notes: emailForm.body,
      dateTime: now.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) + ' at ' + now.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' }),
      date: now.toISOString().split('T')[0],
    };
    setActivities(prev => [entry, ...prev]);
    setEmailForm({ companyId: '', companyName: '', contactEmail: '', subject: '', body: '', direction: 'Sent', replyBy: '' });
    setComposeMode(null);
  };

  const deleteRow = (id) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div data-testid="communications-page" style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:C.cream }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <div style={{ fontSize:28, fontWeight:700, color:C.navy, letterSpacing:'-.3px' }}>Communications</div>
          <div style={{ fontSize:13, color:'#888', marginTop:3 }}>All calls, emails, meetings & notes in one place</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <BtnPrimary data-testid="log-activity-btn" onClick={() => setComposeMode(composeMode === 'activity' ? null : 'activity')} style={ composeMode === 'activity' ? { background:'#6b7280' } : {} }>
            {composeMode === 'activity' ? '✕ Cancel' : '+ Log Activity'}
          </BtnPrimary>
          <BtnPrimary data-testid="compose-email-btn" onClick={() => setComposeMode(composeMode === 'email' ? null : 'email')} style={{ background: composeMode === 'email' ? '#6b7280' : '#1565c0' }}>
            {composeMode === 'email' ? '✕ Cancel' : '✉ Compose Email'}
          </BtnPrimary>
          <BtnSecondary>↓ Export CSV</BtnSecondary>
        </div>
      </div>

      {/* Compose: Activity */}
      {composeMode === 'activity' && (
        <div data-testid="activity-compose-form" style={{ background:'#fff', border:'1px solid #e2ddd6', borderRadius:12, padding:18, marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:12 }}>Log Activity</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <label style={lbl}>Company *</label>
              <select data-testid="activity-company-select" value={actForm.companyId} onChange={e => selectCompanyAct(e.target.value)} style={inp}>
                <option value="">Select...</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Type</label>
              <select data-testid="activity-type-select" value={actForm.type} onChange={e => setActForm(f => ({ ...f, type: e.target.value }))} style={inp}>
                {['Phone','Meeting','Note'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Outcome</label>
              <select data-testid="activity-outcome-select" value={actForm.outcome} onChange={e => setActForm(f => ({ ...f, outcome: e.target.value }))} style={inp}>
                {LOG_OUTCOMES.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <label style={lbl}>Handler</label>
              <HandlerCombobox value={actForm.handler} handlers={handlers} onChange={v => setActForm(f => ({ ...f, handler: v }))} onHandlersChange={setHandlers} />
            </div>
            <div>
              <label style={lbl}>Next Action</label>
              <input data-testid="activity-next-action" value={actForm.nextAction} onChange={e => setActForm(f => ({ ...f, nextAction: e.target.value }))} placeholder="e.g. Call back Friday" style={inp} />
            </div>
          </div>
          <label style={lbl}>Notes *</label>
          <textarea data-testid="activity-notes" value={actForm.notes} onChange={e => setActForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="What happened..." style={{ ...inp, resize:'vertical', marginBottom:10 }} />
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <BtnSecondary onClick={() => setComposeMode(null)}>Cancel</BtnSecondary>
            <BtnPrimary data-testid="save-activity-btn" onClick={saveActivity}>Save Activity</BtnPrimary>
          </div>
        </div>
      )}

      {/* Compose: Email */}
      {composeMode === 'email' && (
        <div data-testid="email-compose-form" style={{ background:'#fff', border:'1px solid #e2ddd6', borderRadius:12, padding:18, marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#1565c0', marginBottom:12 }}>Compose / Log Email</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <label style={lbl}>Company *</label>
              <select data-testid="email-company-select" value={emailForm.companyId} onChange={e => selectCompanyEmail(e.target.value)} style={inp}>
                <option value="">Select...</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Direction</label>
              <select data-testid="email-direction-select" value={emailForm.direction} onChange={e => setEmailForm(f => ({ ...f, direction: e.target.value }))} style={inp}>
                <option value="Sent">Sent (You → Company)</option>
                <option value="Received">Received (Company → You)</option>
              </select>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <label style={lbl}>To / From Email</label>
              <input data-testid="email-contact-input" type="email" value={emailForm.contactEmail} onChange={e => setEmailForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="contact@company.com" style={inp} />
            </div>
            <div>
              <label style={lbl}>Reply By (optional)</label>
              <input data-testid="email-reply-by" type="date" value={emailForm.replyBy} onChange={e => setEmailForm(f => ({ ...f, replyBy: e.target.value }))} style={inp} />
            </div>
          </div>
          <div style={{ marginBottom:10 }}>
            <label style={lbl}>Subject *</label>
            <input data-testid="email-subject-input" value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} placeholder="Email subject..." style={inp} />
          </div>
          <div style={{ marginBottom:10 }}>
            <label style={lbl}>Body</label>
            <textarea data-testid="email-body-input" value={emailForm.body} onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))} rows={4} placeholder="Email body..." style={{ ...inp, resize:'vertical' }} />
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <BtnSecondary onClick={() => setComposeMode(null)}>Cancel</BtnSecondary>
            <BtnPrimary data-testid="save-email-btn" onClick={saveEmail} style={{ background:'#1565c0' }}>
              {emailForm.direction === 'Sent' ? 'Send & Log Email' : 'Log Received Email'}
            </BtnPrimary>
          </div>
        </div>
      )}

      {/* Search + Company Filter */}
      <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fff', border:'1px solid #e2ddd6', borderRadius:8, padding:'8px 12px', flex:1, maxWidth:320 }}>
          <span style={{ color:'#bbb' }}>🔍</span>
          <input data-testid="comm-search" type="text" placeholder="Search communications..." value={filter} onChange={e=>setFilter(e.target.value)} style={{ border:'none', outline:'none', fontSize:13, fontFamily:'inherit', width:'100%' }} />
        </div>
        {companyFilter && (
          <div data-testid="company-filter-chip" style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:'#e8f0fd', border:'1.5px solid #5b82e0', borderRadius:20, fontSize:12, fontWeight:700, color:'#1a3a8b' }}>
            Showing: {companyFilter.name}
            <span data-testid="clear-company-filter" onClick={() => setCompanyFilter(null)} style={{ cursor:'pointer', color:'#c62828', fontSize:11, marginLeft:2 }}>✕</span>
          </div>
        )}
        <div style={{ marginLeft:'auto', fontSize:12, color:'#aaa', alignSelf:'center' }}>{rows.length} items</div>
      </div>

      {/* Table */}
      <div style={{ background:'#fff', border:'1px solid #e2ddd6', borderRadius:12, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr>
              {['Date / Time','Company','Type','Outcome','Handler','Notes','Next Action',''].map(h => (
                <th key={h} style={{ background:'#f0f4f9', padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'.5px', borderBottom:'1px solid #e8e2d8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} style={{ padding:24, textAlign:'center', color:'#bbb', fontStyle:'italic' }}>No communications logged yet</td></tr>
            ) : (
              rows.map((a, i) => {
                const badge = OUTCOME_BADGE[a.outcome] || OUTCOME_BADGE[a.status] || OUTCOME_BADGE.Pending;
                const isEmail = a.type === 'Email';
                return (
                  <tr key={a.id} data-testid={`comm-row-${a.id}`}
                    onClick={() => setCompanyFilter(companyFilter?.name === a.companyName ? null : { id: a.companyId, name: a.companyName })}
                    style={{ borderBottom:'1px solid #f0ece4', background: i%2===1?'#faf8f5':'#fff', cursor:'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0ece4'}
                    onMouseLeave={e => e.currentTarget.style.background = i%2===1?'#faf8f5':'#fff'}
                  >
                    <td style={{ padding:'9px 12px', whiteSpace:'nowrap', color:'#aaa', verticalAlign:'top' }}>{a.dateTime}</td>
                    <td style={{ padding:'9px 12px', fontWeight:700, color:C.navy, verticalAlign:'top' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span
                          data-testid={`comm-company-link-${a.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const co = companies.find(c => c.id === a.companyId || c.name === a.companyName);
                            setCompanyFilter({ id: a.companyId, name: a.companyName });
                            if (co) {
                              setActForm(f => ({ ...f, companyId: co.id, companyName: co.name }));
                              setComposeMode('activity');
                            }
                          }}
                          style={{ cursor:'pointer', borderBottom:'1px dashed #b0c4e8' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#2563b8'}
                          onMouseLeave={e => e.currentTarget.style.color = C.navy}
                        >{a.companyName}</span>
                        <span
                          data-testid={`comm-company-card-${a.id}`}
                          onClick={(e) => { e.stopPropagation(); const co = companies.find(c => c.id === a.companyId || c.name === a.companyName); if (co) setSelected(co); }}
                          title="Open company profile"
                          style={{ width:22, height:18, borderRadius:4, background:'#e8f0fd', border:'1px solid #c5d0f0', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#5b82e0'; e.currentTarget.style.borderColor = '#5b82e0'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#e8f0fd'; e.currentTarget.style.borderColor = '#c5d0f0'; }}
                        >
                          <svg width="12" height="10" viewBox="0 0 24 20" fill="none" stroke="#5b82e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="22" height="18" rx="3" /><circle cx="9" cy="9" r="3" /><path d="M3 17c0-2.5 2.7-4 6-4s6 1.5 6 4" /><line x1="17" y1="7" x2="21" y2="7" /><line x1="17" y1="11" x2="21" y2="11" /></svg>
                        </span>
                      </div>
                    </td>
                    <td style={{ padding:'9px 12px', verticalAlign:'top' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:DOT[a.type]||'#888', flexShrink:0 }} />
                        {a.type}
                        {isEmail && a.direction && <span style={{ fontSize:10, color: a.direction === 'Sent' ? '#1565c0' : '#2e7d32', marginLeft:2 }}>({a.direction === 'Sent' ? '↗' : '↙'})</span>}
                      </div>
                    </td>
                    <td style={{ padding:'9px 12px', verticalAlign:'top' }}>
                      <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, background: badge.bg, color: badge.c }}>{a.outcome || a.status || ''}</span>
                    </td>
                    <td style={{ padding:'9px 12px', color:'#666', verticalAlign:'top' }}>{a.handler}</td>
                    <td style={{ padding:'9px 12px', color:'#444', maxWidth:220, verticalAlign:'top' }}>
                      <div
                        data-testid={`comm-notes-${a.id}`}
                        onClick={(e) => { e.stopPropagation(); setNoteOpen(noteOpen === a.id ? null : a.id); }}
                        style={{ cursor:'pointer' }}
                        title="Click to read full notes"
                      >
                        {isEmail && a.subject ? <div style={{ fontWeight:600, color:'#333', marginBottom:2 }}>{a.subject}</div> : null}
                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.notes || '—'}</div>
                      </div>
                    </td>
                    <td style={{ padding:'9px 12px', color:C.blue, verticalAlign:'top' }}>
                      {isEmail && a.replyBy ? <span style={{ fontSize:11, fontWeight:600 }}>Reply by {a.replyBy}</span> : a.nextAction || ''}
                    </td>
                    <td style={{ padding:'9px 12px', verticalAlign:'top' }}>
                      <span data-testid={`delete-comm-${a.id}`} onClick={(e) => { e.stopPropagation(); deleteRow(a.id); }} style={{ color:'#c62828', cursor:'pointer', fontSize:11, fontWeight:600 }}>✕</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Notes Modal */}
      {noteOpen && (() => {
        const a = activities.find(x => x.id === noteOpen);
        if (!a) return null;
        const isEmail = a.type === 'Email';
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(30,45,90,.35)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setNoteOpen(null)}>
            <div data-testid={`notepad-${a.id}`} onClick={e => e.stopPropagation()} style={{ width:520, maxHeight:'70vh', background:'#fffef8', border:'1.5px solid #d4c9a8', borderRadius:12, boxShadow:'0 12px 40px rgba(0,0,0,.2)', overflow:'hidden', display:'flex', flexDirection:'column' }}>
              <div style={{ background:'#f5f0e0', padding:'12px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #d4c9a8', flexShrink:0 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#333' }}>{a.companyName}</div>
                  <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{a.type} — {a.dateTime}{a.handler ? ` — ${a.handler}` : ''}</div>
                </div>
                <span onClick={() => setNoteOpen(null)} style={{ cursor:'pointer', fontSize:18, color:'#999', fontWeight:700, padding:'0 4px' }}>✕</span>
              </div>
              <div style={{ padding:18, overflowY:'auto', flex:1 }}>
                {isEmail && a.subject && <div style={{ fontSize:14, fontWeight:700, color:'#333', marginBottom:10, paddingBottom:8, borderBottom:'1px solid #e8e2d6' }}>Subject: {a.subject}</div>}
                <div style={{ fontSize:14, color:'#333', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{a.notes || 'No notes recorded.'}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Company Profile Drawer */}
      {selected && (
        <div style={{ position: 'relative' }}>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(30,45,90,.18)', zIndex: 100 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, width: 500, height: '100vh', background: C.cream, borderLeft: '1px solid #d0cbc2', overflowY: 'auto', zIndex: 101 }}>
            <CompanyCard
              company={selected}
              activities={activities}
              handlers={handlers}
              onHandlersChange={setHandlers}
              onSave={(updated) => { setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c)); setSelected(updated); }}
              onLogActivity={(entry) => setActivities(prev => [entry, ...prev])}
              onClose={() => setSelected(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── EARNINGS TRACKER ────────────────────────────────────────────────────
// ── SETTINGS ─────────────────────────────────────────────────────────────
export function Settings({ handlers, setHandlers, user, setUser }) {
  const [newHandler, setNewHandler] = useState('');
  const [tab, setTab] = useState('personal');
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({ ...user });

  const addHandler = () => { if (!newHandler.trim()) return; if (!handlers.includes(newHandler.trim())) setHandlers(prev=>[...prev, newHandler.trim()]); setNewHandler(''); };
  const renameH = (i) => { const n=prompt(`Rename "${handlers[i]}" to:`, handlers[i]); if (!n||n===handlers[i]) return; setHandlers(prev=>prev.map((h,idx)=>idx===i?n:h)); };
  const deleteH = (i) => { if (!window.confirm(`Delete "${handlers[i]}"?`)) return; setHandlers(prev=>prev.filter((_,idx)=>idx!==i)); };

  const saveProfile = () => {
    const updated = { ...profile, name: `${profile.firstName} ${profile.lastName}`.trim() };
    setUser(updated);
    setProfile(updated);
    setEditing(false);
  };

  const toggleIndustry = (ind) => setProfile(p => ({ ...p, industries: p.industries?.includes(ind) ? p.industries.filter(i=>i!==ind) : [...(p.industries||[]), ind] }));
  const toggleVehicle = (v) => setProfile(p => ({ ...p, vehicles: p.vehicles?.includes(v) ? p.vehicles.filter(i=>i!==v) : [...(p.vehicles||[]), v] }));

  const fc = { background:'#fff', border:'1px solid #e2ddd6', borderRadius:12, padding:22, marginBottom:16 };
  const lbl = { display:'block', fontSize:11, fontWeight:600, color:'#555', marginBottom:5 };
  const inp = { width:'100%', padding:'10px 12px', border:'1px solid #e2ddd6', borderRadius:8, fontSize:13, fontFamily:'inherit', background:'#fff', outline:'none', boxSizing:'border-box' };

  const TABS = ['Personal','License','Medical','Contact','Security'];
  const GOALS = ['Full-time income replacement','Part-time supplemental income','Flexible schedule control','Experience different industries'];
  const INCOMES = ['$500 - $1,500/month','$1,500 - $3,000/month','$3,000 - $5,000/month','$5,000+/month'];
  const INDUSTRIES = ['Food','Package Delivery','Rideshare','Freight','Medical','Cannabis Delivery','Pet Transport','Child Transport','Senior Services','Air Transport','Vehicle Transport','Luggage Delivery','Other'];
  const VEHICLES = [
    { id:'Car', label:'Car (includes Car, Sedan, Prius, EV, Hybrid)' },
    { id:'SUV', label:'SUV (includes SUV, Luxury SUV)' },
    { id:'Van', label:'Van (includes Van, Cargo Van, Minivan, Sprinter Van, Shuttle)' },
    { id:'Truck', label:'Truck (includes Truck, Pickup Truck, Box Truck, Tractor-Trailer)' },
    { id:'Bike', label:'Bike (includes Bike, Bicycle, Scooter)' },
    { id:'Other', label:'Other (includes everything else)' },
  ];
  const DISTANCES = ['Local only (within 15 miles)','Regional (15-50 miles)','Long distance (50+ miles)','Flexible/Variable distance'];

  const Radio = ({ checked, label, onClick }) => (
    <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0', cursor:'pointer', flex:'1 1 45%' }}>
      <div style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${checked?'#3b5bdb':'#ccc'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {checked && <div style={{ width:10, height:10, borderRadius:'50%', background:'#3b5bdb' }} />}
      </div>
      <span style={{ fontSize:13, color:'#333' }}>{label}</span>
    </div>
  );

  const Checkbox = ({ checked, label, onClick }) => (
    <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', cursor:'pointer', flex:'1 1 30%', minWidth:160 }}>
      <div style={{ width:18, height:18, borderRadius:4, border:`2px solid ${checked?'#3b5bdb':'#ccc'}`, background:checked?'#3b5bdb':'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {checked && <span style={{ color:'#fff', fontSize:12, fontWeight:700, lineHeight:1 }}>✓</span>}
      </div>
      <span style={{ fontSize:13, color:'#333' }}>{label}</span>
    </div>
  );

  return (
    <div data-testid="settings-page" style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:C.cream }}>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:28, fontWeight:700, color:C.navy }}>User Profile</div>
        <div style={{ fontSize:13, color:'#888', marginTop:3 }}>Manage your account settings</div>
      </div>

      {/* Profile Overview Card */}
      <div style={fc}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ fontSize:15, fontWeight:700, color:C.navy }}>Profile Overview</div>
          <button data-testid="edit-profile-btn" onClick={() => { setEditing(!editing); setTab('personal'); }} style={{ padding:'8px 18px', border:'none', borderRadius:8, background:'#4ecdc4', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            {editing ? '✕ Cancel' : '✏ Edit Profile'}
          </button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div><div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'#aaa', marginBottom:3 }}>Full Name</div><div style={{ fontSize:15, fontWeight:600, color:'#222' }}>{user.name || '—'}</div></div>
          <div><div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'#aaa', marginBottom:3 }}>Email</div><div style={{ fontSize:15, color:'#222' }}>{user.email || '—'}</div></div>
          <div><div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'#aaa', marginBottom:3 }}>Username</div><div style={{ fontSize:15, color:'#222' }}>{user.username || '—'}</div></div>
          <div><div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'#aaa', marginBottom:3 }}>Account Type</div><span style={{ display:'inline-block', padding:'4px 14px', borderRadius:20, fontSize:12, fontWeight:700, background:'linear-gradient(135deg,#e040fb,#d500f9)', color:'#fff' }}>{user.accountType || 'Standard'}</span></div>
        </div>
      </div>

      {/* Tabs */}
      {editing && (
        <>
          <div style={{ display:'flex', background:'#fff', border:'1px solid #e2ddd6', borderRadius:12, overflow:'hidden', marginBottom:16 }}>
            {TABS.map(t => {
              const k = t.toLowerCase();
              return (
                <div key={k} data-testid={`tab-${k}`} onClick={() => setTab(k)}
                  style={{ flex:1, padding:'12px 0', textAlign:'center', fontSize:13, fontWeight: tab===k?700:500, color: tab===k?C.navy:'#888', cursor:'pointer', borderBottom: tab===k?`3px solid ${C.navy}`:'3px solid transparent', background: tab===k?'#f8f9ff':'transparent' }}
                >{t}</div>
              );
            })}
          </div>

          {/* PERSONAL TAB */}
          {tab === 'personal' && (
            <div style={fc}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
                <div style={{ fontSize:16, fontWeight:700, color:'#222' }}>Personal Information</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
                <div><label style={lbl}>First Name</label><input data-testid="profile-first-name" value={profile.firstName||''} onChange={e=>setProfile(p=>({...p,firstName:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>Last Name</label><input data-testid="profile-last-name" value={profile.lastName||''} onChange={e=>setProfile(p=>({...p,lastName:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>Username</label><input value={profile.username||''} onChange={e=>setProfile(p=>({...p,username:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>Date of Birth</label><input type="date" value={profile.dob||''} onChange={e=>setProfile(p=>({...p,dob:e.target.value}))} style={inp} /></div>
              </div>

              {/* Goals & Objectives */}
              <div style={{ borderTop:'2px solid #eee', paddingTop:20, marginTop:10 }}>
                <div style={{ fontSize:16, fontWeight:700, color:'#222', marginBottom:4 }}>Goals & Objectives Questionnaire</div>
                <div style={{ fontSize:12, color:'#888', marginBottom:18 }}>Help us understand your goals and preferences to provide personalized recommendations.</div>

                <div style={{ background:'#f8f9fc', borderRadius:10, padding:'16px 18px', marginBottom:14 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'#333', marginBottom:10 }}>What's your primary goal with gig work?</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {GOALS.map(g => <Radio key={g} checked={profile.goal===g} label={g} onClick={()=>setProfile(p=>({...p,goal:g}))} />)}
                  </div>
                </div>

                <div style={{ background:'#f8f9fc', borderRadius:10, padding:'16px 18px', marginBottom:14 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'#333', marginBottom:10 }}>What's your target monthly income from gig work?</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {INCOMES.map(g => <Radio key={g} checked={profile.income===g} label={g} onClick={()=>setProfile(p=>({...p,income:g}))} />)}
                  </div>
                </div>

                <div style={{ background:'#f8f9fc', borderRadius:10, padding:'16px 18px', marginBottom:14 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'#333', marginBottom:10 }}>Which industries interest you most?</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {INDUSTRIES.map(g => <Checkbox key={g} checked={(profile.industries||[]).includes(g)} label={g} onClick={()=>toggleIndustry(g)} />)}
                  </div>
                </div>

                <div style={{ background:'#f8f9fc', borderRadius:10, padding:'16px 18px', marginBottom:14 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'#333', marginBottom:10 }}>What vehicle types do you have available for gig work?</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {VEHICLES.map(v => <Checkbox key={v.id} checked={(profile.vehicles||[]).includes(v.id)} label={v.label} onClick={()=>toggleVehicle(v.id)} />)}
                  </div>
                </div>

                <div style={{ background:'#f8f9fc', borderRadius:10, padding:'16px 18px', marginBottom:14 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'#333', marginBottom:10 }}>How far are you willing to travel for gig work?</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {DISTANCES.map(g => <Radio key={g} checked={profile.travelDistance===g} label={g} onClick={()=>setProfile(p=>({...p,travelDistance:g}))} />)}
                  </div>
                </div>

                <div style={{ borderLeft:'3px solid #3b5bdb', paddingLeft:16, marginTop:18 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'#333', marginBottom:8 }}>Additional Information</div>
                  <div style={{ background:'#f0f4ff', borderRadius:8, padding:14, fontSize:12, color:'#3b5bdb', lineHeight:1.6, marginBottom:12, border:'1px solid #c5d0f0' }}>
                    <strong>Help Your AI Assistant Help You:</strong> Please share detailed information about your interests in independent driving. Include things like your goals, preferred service types, any special skills or certifications, geographic preferences, scheduling flexibility, vehicle capabilities, and what success looks like to you.
                  </div>
                  <textarea data-testid="profile-additional-info" value={profile.additionalInfo||''} onChange={e=>setProfile(p=>({...p,additionalInfo:e.target.value}))} rows={5} placeholder="Tell us about your gig driving interests, goals, and preferences..." style={{ ...inp, resize:'vertical', lineHeight:1.6 }} />
                </div>
              </div>
            </div>
          )}

          {/* LICENSE TAB */}
          {tab === 'license' && (
            <div style={fc}>
              <div style={{ fontSize:16, fontWeight:700, color:'#222', marginBottom:18 }}>License Information</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div><label style={lbl}>License Number</label><input value={profile.licenseNumber||''} onChange={e=>setProfile(p=>({...p,licenseNumber:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>License State</label><input value={profile.licenseState||''} onChange={e=>setProfile(p=>({...p,licenseState:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>Expiration Date</label><input type="date" value={profile.licenseExpiry||''} onChange={e=>setProfile(p=>({...p,licenseExpiry:e.target.value}))} style={inp} /></div>
              </div>
            </div>
          )}

          {/* MEDICAL TAB */}
          {tab === 'medical' && (
            <div style={fc}>
              <div style={{ fontSize:16, fontWeight:700, color:'#222', marginBottom:18 }}>Medical Information</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={lbl}>DOT Medical Card</label>
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0' }}>
                    <Checkbox checked={profile.medicalCard||false} label="I have a valid DOT Medical Card" onClick={()=>setProfile(p=>({...p,medicalCard:!p.medicalCard}))} />
                  </div>
                </div>
                <div><label style={lbl}>Medical Card Expiry</label><input type="date" value={profile.medicalExpiry||''} onChange={e=>setProfile(p=>({...p,medicalExpiry:e.target.value}))} style={inp} /></div>
              </div>
            </div>
          )}

          {/* CONTACT TAB */}
          {tab === 'contact' && (
            <div style={fc}>
              <div style={{ fontSize:16, fontWeight:700, color:'#222', marginBottom:18 }}>Contact Information</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div><label style={lbl}>Phone</label><input value={profile.phone||''} onChange={e=>setProfile(p=>({...p,phone:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>Email</label><input value={profile.email||''} onChange={e=>setProfile(p=>({...p,email:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>Address</label><input value={profile.address||''} onChange={e=>setProfile(p=>({...p,address:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>City</label><input value={profile.city||''} onChange={e=>setProfile(p=>({...p,city:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>State</label><input value={profile.state||''} onChange={e=>setProfile(p=>({...p,state:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>Zip Code</label><input value={profile.zip||''} onChange={e=>setProfile(p=>({...p,zip:e.target.value}))} style={inp} /></div>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {tab === 'security' && (
            <div style={fc}>
              <div style={{ fontSize:16, fontWeight:700, color:'#222', marginBottom:18 }}>Security Settings</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div><label style={lbl}>Current Password</label><input type="password" placeholder="Enter current password" style={inp} /></div>
                <div><label style={lbl}>New Password</label><input type="password" placeholder="Enter new password" style={inp} /></div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div style={{ textAlign:'right', marginBottom:16 }}>
            <button data-testid="save-settings-btn" onClick={saveProfile} style={{ padding:'11px 28px', border:'none', borderRadius:8, background:'#3b5bdb', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Save Settings</button>
          </div>
        </>
      )}

      {/* Handler Management */}
      <div style={fc}>
        <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:14, paddingBottom:10, borderBottom:'1px solid #f0ece4' }}>Handler Management</div>
        {handlers.map((h,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #f5f0e6' }}>
            <span style={{ flex:1, fontSize:13, color:'#222' }}>{h}</span>
            <button onClick={()=>renameH(i)} style={{ padding:'4px 10px', border:'1px solid #e0ddd8', borderRadius:6, background:'#fff', fontSize:11, color:'#555', cursor:'pointer' }}>✏ Rename</button>
            {i > 0 && <button onClick={()=>deleteH(i)} style={{ padding:'4px 10px', border:'1px solid #ffcdd2', borderRadius:6, background:'#fff', fontSize:11, color:'#c62828', cursor:'pointer' }}>✕</button>}
          </div>
        ))}
        <div style={{ marginTop:12, display:'flex', gap:8 }}>
          <input value={newHandler} onChange={e=>setNewHandler(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addHandler()} placeholder="New handler name..." style={{ ...inp, flex:1, marginBottom:0 }} />
          <button onClick={addHandler} style={{ padding:'9px 16px', border:'none', borderRadius:8, background:C.navy, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Add</button>
        </div>
      </div>

      {/* Data Management */}
      <div style={fc}>
        <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:14, paddingBottom:10, borderBottom:'1px solid #f0ece4' }}>Data Management</div>
        <div style={{ display:'flex', gap:10 }}>
          {['↓ Export All Data (CSV)','↑ Import Companies (CSV)'].map(label => (
            <button key={label} style={{ padding:'9px 18px', border:'1.5px solid #ddd', borderRadius:8, background:'#fff', color:'#555', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
