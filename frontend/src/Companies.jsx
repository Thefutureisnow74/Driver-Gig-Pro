import React, { useState, useRef, useEffect } from 'react';
import { C, STATUS_COLORS, PRIORITY_COLORS, ALL_STATES, ALL_MODELS, ALL_SERVICES, ALL_VEHICLES, STATUSES, PRIORITIES, CONTACT_METHODS } from './theme';
import { StatusBadge, PriorityBadge, BtnPrimary, Card } from './components';
import CompanyCard from './CompanyCard';
import HandlerCombobox from './HandlerCombobox';
import { apiCreateCompany, apiUpdateCompany, apiDeleteCompany, apiCreateActivity } from './api';

function SearchableDropdown({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // value is always an array
  const selected = value || [];
  const filtered = typed ? options.filter(o => o.toLowerCase().includes(typed.toLowerCase())) : options;
  const allSelected = selected.length === options.length && options.length > 0;
  const active = selected.length > 0;
  const display = active ? (selected.length === options.length ? `All ${placeholder?.replace('All ', '')}` : selected.length === 1 ? selected[0] : `${selected.length} selected`) : '';

  const toggle = (item) => {
    onChange(selected.includes(item) ? selected.filter(v => v !== item) : [...selected, item]);
  };
  const selectAll = () => {
    onChange(allSelected ? [] : [...options]);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => { setOpen(!open); setTyped(''); }}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 10px', border: `1.5px solid ${active ? '#5b82e0' : '#e2ddd6'}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', background: active ? '#e8f0fd' : '#fff', color: active ? '#1a3a8b' : '#555', cursor: 'pointer', fontWeight: active ? 700 : 500, minWidth: 120, userSelect: 'none' }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{display || placeholder}</span>
        {active && (
          <span onClick={e => { e.stopPropagation(); onChange([]); setOpen(false); }} style={{ fontSize: 10, color: '#c62828', cursor: 'pointer', padding: '0 2px' }}>✕</span>
        )}
        <span style={{ fontSize: 8, color: '#aaa', marginLeft: 2 }}>▼</span>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 3px)', left: 0, minWidth: '100%', width: 220, background: '#fff', border: '1.5px solid #5b82e0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.12)', zIndex: 300, overflow: 'hidden' }}>
          <div style={{ padding: 6 }}>
            <input
              autoFocus
              type="text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={`Type to filter...`}
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {/* Select All */}
          {!typed && (
            <div
              onClick={selectAll}
              style={{ padding: '7px 12px', fontSize: 12, cursor: 'pointer', color: allSelected ? '#1a3a8b' : '#333', background: allSelected ? '#e8f0fd' : 'transparent', fontWeight: 700, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 7 }}
              onMouseEnter={e => { if (!allSelected) e.currentTarget.style.background = '#f5f5f2'; }}
              onMouseLeave={e => { if (!allSelected) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${allSelected ? '#5b82e0' : '#ccc'}`, background: allSelected ? '#5b82e0' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', flexShrink: 0 }}>{allSelected ? '✓' : ''}</span>
              Select All
            </div>
          )}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 12px', fontSize: 11, color: '#bbb', fontStyle: 'italic' }}>No matches</div>
            ) : (
              filtered.map(o => {
                const checked = selected.includes(o);
                return (
                  <div
                    key={o}
                    onClick={() => toggle(o)}
                    style={{ padding: '7px 12px', fontSize: 12, cursor: 'pointer', color: checked ? '#1a3a8b' : '#333', background: checked ? '#e8f0fd' : 'transparent', fontWeight: checked ? 700 : 400, display: 'flex', alignItems: 'center', gap: 7 }}
                    onMouseEnter={e => { if (!checked) e.currentTarget.style.background = '#f5f5f2'; }}
                    onMouseLeave={e => { if (!checked) e.currentTarget.style.background = checked ? '#e8f0fd' : 'transparent'; }}
                  >
                    <span style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${checked ? '#5b82e0' : '#ccc'}`, background: checked ? '#5b82e0' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', flexShrink: 0 }}>{checked ? '✓' : ''}</span>
                    {o}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function initials(name) { return name ? name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() : '??'; }

/* ── Video Upload Popup ─────────────────────────────────────────────── */
function VideoPopup({ company, onUpdate, onClose }) {
  const fileRef = useRef(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const videos = company.videos || [];

  const handleFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const newVids = [];
    let loaded = 0;
    Array.from(fileList).forEach(file => {
      const id = 'v' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const reader = new FileReader();
      reader.onload = (e) => {
        newVids.push({ id, name: file.name, size: file.size, dataUrl: e.target.result, uploadedAt: new Date().toISOString(), source: 'file' });
        loaded++;
        if (loaded === fileList.length) {
          onUpdate({ ...company, videos: [...newVids, ...videos] });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const addLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    const id = 'vl' + Date.now();
    const label = linkName.trim() || url.replace(/^https?:\/\//, '').slice(0, 40);
    const isYt = /youtu\.?be/.test(url);
    onUpdate({ ...company, videos: [{ id, name: label, url, size: 0, uploadedAt: new Date().toISOString(), source: 'link', isYoutube: isYt }, ...videos] });
    setLinkUrl('');
    setLinkName('');
  };

  const removeVideo = (vid) => {
    onUpdate({ ...company, videos: videos.filter(v => v.id !== vid) });
  };

  const fmtSize = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : b > 0 ? (b / 1024).toFixed(0) + ' KB' : '';

  const inp = { width: '100%', padding: '7px 9px', border: '1.5px solid #ddd', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', background: '#fff', color: '#111', outline: 'none', boxSizing: 'border-box' };

  return (
    <div data-testid="video-popup" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 340, background: '#fff', border: '1.5px solid #5b82e0', borderRadius: 10, boxShadow: '0 6px 24px rgba(0,0,0,.15)', zIndex: 400, overflow: 'hidden' }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ background: C.navy, color: '#fff', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Videos — {company.name}</span>
        <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 16 }}>✕</span>
      </div>
      <div style={{ padding: 12 }}>

        {/* Add Link */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#888', marginBottom: 5 }}>Add Video Link</div>
          <input data-testid="video-link-url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://youtube.com/watch?v=... or any URL" style={{ ...inp, marginBottom: 5 }} onKeyDown={e => e.key === 'Enter' && addLink()} />
          <div style={{ display: 'flex', gap: 5 }}>
            <input data-testid="video-link-name" value={linkName} onChange={e => setLinkName(e.target.value)} placeholder="Label (optional)" style={{ ...inp, flex: 1 }} onKeyDown={e => e.key === 'Enter' && addLink()} />
            <button data-testid="video-link-add-btn" onClick={addLink} style={{ padding: '7px 14px', border: 'none', borderRadius: 6, background: C.navy, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>+ Add</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 10px' }}>
          <div style={{ flex: 1, height: 1, background: '#e2ddd6' }} />
          <span style={{ fontSize: 10, color: '#bbb', fontWeight: 600 }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#e2ddd6' }} />
        </div>

        {/* Upload from computer */}
        <input ref={fileRef} type="file" accept="video/*" multiple style={{ display: 'none' }} onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
        <div
          data-testid="video-upload-drop"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          style={{ border: '2px dashed #c5d0f0', borderRadius: 8, padding: '12px 10px', textAlign: 'center', cursor: 'pointer', background: '#f8f9ff', marginBottom: 10 }}
        >
          <div style={{ fontSize: 18, marginBottom: 2 }}>🎬</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a3a8b' }}>Upload from computer</div>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>MP4, MOV, AVI, WebM</div>
        </div>

        {/* Video list */}
        {videos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 8, fontSize: 11, color: '#bbb', fontStyle: 'italic' }}>No videos yet</div>
        ) : (
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {videos.map(v => (
              <div key={v.id} data-testid={`video-item-${v.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f0ece4' }}>
                {v.source === 'link' ? (
                  <a href={v.url} target="_blank" rel="noreferrer" style={{ width: 26, height: 26, borderRadius: 6, background: v.isYoutube ? '#FF0000' : '#1565c0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', textDecoration: 'none', flexShrink: 0 }} title={v.url}>▶</a>
                ) : (
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>🎥</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {v.source === 'link' ? (
                    <a href={v.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, color: '#1a3a8b', textDecoration: 'none', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</a>
                  ) : (
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</div>
                  )}
                  <div style={{ fontSize: 10, color: '#aaa' }}>{v.source === 'link' ? 'Link' : fmtSize(v.size)}</div>
                </div>
                <span data-testid={`video-delete-${v.id}`} onClick={() => removeVideo(v.id)} style={{ fontSize: 11, color: '#c62828', cursor: 'pointer', padding: '2px 6px', fontWeight: 700 }}>✕</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Companies({ companies, setCompanies, activities, setActivities, handlers, setHandlers, user }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterState, setFilterState] = useState([]);
  const [filterModel, setFilterModel] = useState([]);
  const [filterVehicle, setFilterVehicle] = useState([]);
  const [filterService, setFilterService] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [videoPopupId, setVideoPopupId] = useState(null);
  const [recsOpen, setRecsOpen] = useState(false);
  const [servicePopup, setServicePopup] = useState(false);

  // Close video popup on outside click
  useEffect(() => {
    if (!videoPopupId) return;
    const close = (e) => {
      if (!e.target.closest('[data-testid="video-popup"]') && !e.target.closest('[data-testid^="video-icon-"]')) {
        setVideoPopupId(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [videoPopupId]);

  const filtered = companies.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.handler?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || c.status === filterStatus;
    const matchState = filterState.length === 0 || (c.activeStates?.includes('ALL_50') || filterState.some(s => c.activeStates?.includes(s)));
    const matchModel = filterModel.length === 0 || filterModel.some(m => (c.workModel || []).includes(m));
    const matchVehicle = filterVehicle.length === 0 || filterVehicle.some(v => (c.vehicles || []).includes(v));
    const matchService = filterService.length === 0 || filterService.some(s => (c.serviceType || []).includes(s));
    return matchSearch && matchStatus && matchState && matchModel && matchVehicle && matchService;
  });

  const clearAll = () => { setFilterStatus(''); setFilterState([]); setFilterModel([]); setFilterVehicle([]); setFilterService([]); setSearch(''); };
  const hasFilters = filterStatus || filterState.length || filterModel.length || filterVehicle.length || filterService.length || search;

  const handleSave = async (updated) => {
    try {
      const saved = await apiUpdateCompany(updated.id, updated);
      setCompanies(prev => prev.map(c => c.id === saved.id ? saved : c));
      setSelected(saved);
    } catch (err) {
      console.error('Save failed:', err);
      setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
      setSelected(updated);
    }
  };

  const handleVideoUpdate = (updated) => {
    setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
    if (selected?.id === updated.id) setSelected(updated);
  };

  const handleLogActivity = async (entry) => {
    try {
      const saved = await apiCreateActivity(entry);
      setActivities(prev => [saved, ...prev]);
    } catch (err) {
      console.error('Log activity failed:', err);
      setActivities(prev => [entry, ...prev]);
    }
  };

  const handleAddCompany = async (newCo) => {
    try {
      const saved = await apiCreateCompany(newCo);
      setCompanies(prev => [...prev, saved]);
      setAddOpen(false);
      setSelected(saved);
    } catch (err) {
      console.error('Add company failed:', err);
    }
  };

  const handleDeleteCompany = async (id) => {
    try {
      await apiDeleteCompany(id);
      setCompanies(prev => prev.filter(c => c.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const s = {
    page: { flex: 1, overflowY: 'auto', padding: '28px 32px', background: C.cream },
    header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: 700, color: C.navy, letterSpacing: '-.3px' },
    sub: { fontSize: 13, color: '#888', marginTop: 3 },
    filterBar: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' },
    searchWrap: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2ddd6', borderRadius: 8, padding: '8px 12px', flex: 1, maxWidth: 260 },
    searchInp: { border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', color: '#111', width: '100%', background: 'transparent' },
    filterPill: (on) => ({ padding: '7px 14px', border: `1.5px solid ${on ? '#5b82e0' : '#e2ddd6'}`, borderRadius: 20, fontSize: 12, fontWeight: on ? 700 : 500, color: on ? '#1a3a8b' : '#555', background: on ? '#e8f0fd' : '#fff', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }),
    tableWrap: { background: '#fff', border: '1px solid #e2ddd6', borderRadius: 12, overflow: 'hidden' },
    th: { background: '#f0f4f9', padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid #e8e2d8', whiteSpace: 'nowrap' },
    td: { padding: '10px 14px', verticalAlign: 'middle', fontSize: 13 },
  };

  return (
    <div style={{ display: 'flex', flex: 1, height: '100vh', overflow: 'hidden' }}>
      {/* MAIN TABLE AREA */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', background: C.cream }}>
        <div style={s.header}>
          <div>
            <div style={s.title}>Companies</div>
            <div style={s.sub}>{companies.length} gig platforms in your database</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end' }}>
            <BtnPrimary onClick={() => setAddOpen(true)}>+ Add Company</BtnPrimary>
            <button data-testid="recs-btn" onClick={() => setRecsOpen(!recsOpen)}
              style={{ padding:'7px 16px', border:'1.5px solid #2e7d32', borderRadius:8, background: recsOpen ? '#2e7d32' : '#fff', color: recsOpen ? '#fff' : '#2e7d32', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              ✦ Top 3 Recommended
            </button>
          </div>
        </div>

        {/* RECOMMENDATIONS - moved to right panel below */}

        <div style={s.filterBar}>
          <div style={s.searchWrap}>
            <span style={{ color: '#bbb', fontSize: 13 }}>🔍</span>
            <input type="text" placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} style={s.searchInp} />
          </div>

          {/* Status pills */}
          <div style={s.filterPill(!filterStatus)} onClick={() => setFilterStatus('')}>All Statuses</div>
          {['Active','Waiting','Overdue','Researching'].map(st => (
            <div key={st} style={s.filterPill(filterStatus === st)} onClick={() => setFilterStatus(filterStatus === st ? '' : st)}>{st}</div>
          ))}
        </div>

        {/* Advanced filter row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          <SearchableDropdown value={filterState} onChange={setFilterState} options={ALL_STATES} placeholder="All States" />
          <SearchableDropdown value={filterModel} onChange={setFilterModel} options={ALL_MODELS} placeholder="All Work Models" />
          <SearchableDropdown value={filterVehicle} onChange={setFilterVehicle} options={ALL_VEHICLES} placeholder="All Vehicles" />
          <SearchableDropdown value={filterService} onChange={setFilterService} options={ALL_SERVICES} placeholder="All Service Types" />

          {hasFilters && (
            <div onClick={clearAll} style={{ padding: '7px 14px', border: '1.5px solid #ffcdd2', borderRadius: 20, fontSize: 12, fontWeight: 700, color: '#c62828', background: '#fff', cursor: 'pointer', userSelect: 'none' }}>✕ Clear Filters</div>
          )}

          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#aaa' }}>Showing {filtered.length} of {companies.length}</div>
        </div>

        <div style={s.tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ ...s.th, width: 36, padding: '10px 6px 10px 14px' }}></th>
                {['Company Name','Service Type','Work Model','Status','Priority','Active States','Handler','Last Modified'].map(h => (
                  <th key={h} style={s.th}
                    onClick={h === 'Service Type' ? (e) => { e.stopPropagation(); setServicePopup(!servicePopup); } : undefined}
                    onMouseEnter={h === 'Service Type' ? (e) => { e.currentTarget.style.color = '#5b82e0'; e.currentTarget.style.cursor = 'pointer'; } : undefined}
                    onMouseLeave={h === 'Service Type' ? (e) => { e.currentTarget.style.color = '#888'; } : undefined}
                  >
                    {h}
                    {h === 'Service Type' && <span style={{ marginLeft: 4, fontSize: 10, color: '#5b82e0', fontWeight: 800 }}>&#9432;</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((co, i) => (
                <tr
                  key={co.id}
                  style={{ borderBottom: '1px solid #f0ece4', cursor: 'pointer', background: i % 2 === 1 ? '#faf8f5' : '#fff' }}
                  onClick={() => setSelected(co)}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f6ff'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? '#faf8f5' : '#fff'}
                >
                  <td style={{ ...s.td, padding: '10px 6px 10px 14px', width: 36, position: 'relative' }}>
                    <div
                      data-testid={`video-icon-${co.id}`}
                      onClick={e => { e.stopPropagation(); setVideoPopupId(videoPopupId === co.id ? null : co.id); }}
                      style={{ position: 'relative', width: 28, height: 28, borderRadius: 6, background: (co.videos && co.videos.length > 0) ? '#1565c0' : '#f0ece4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background .15s' }}
                      title="Upload / manage videos"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={(co.videos && co.videos.length > 0) ? '#fff' : '#aaa'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                      {co.videos && co.videos.length > 0 && (
                        <span style={{ position: 'absolute', top: -5, right: -5, width: 16, height: 16, borderRadius: '50%', background: '#c62828', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{co.videos.length}</span>
                      )}
                    </div>
                    {videoPopupId === co.id && (
                      <VideoPopup
                        company={co}
                        onUpdate={handleVideoUpdate}
                        onClose={() => setVideoPopupId(null)}
                      />
                    )}
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: co.color || C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(co.name)}</div>
                      <span style={{ fontWeight: 700, color: C.navy, fontSize: 13 }}>{co.name}</span>
                      {co.status === 'Active' && <div style={{ width: 6, height: 6, background: C.blue, borderRadius: '50%' }} />}
                    </div>
                  </td>
                  <td style={{ ...s.td, fontSize: 12, color: '#666' }}>
                    {co.serviceType && co.serviceType.length > 0 ? co.serviceType.map((st, i) => (
                      <div key={i} style={{ lineHeight: '1.5' }}>{st}</div>
                    )) : '—'}
                  </td>
                  <td style={s.td}><span style={{ padding: '3px 9px', background: '#f0f4f9', border: '1px solid #dde3ed', borderRadius: 20, fontSize: 11, color: '#555' }}>{co.workModel?.[0] || '—'}</span></td>
                  <td style={s.td}><StatusBadge status={co.status} /></td>
                  <td style={s.td}><PriorityBadge priority={co.priority} /></td>
                  <td style={{ ...s.td, fontSize: 11, fontWeight: 700, color: C.navy }}>{co.activeStates?.includes('ALL_50') ? 'All 50' : (co.activeStates?.slice(0,3).join(', ') + (co.activeStates?.length > 3 ? ` +${co.activeStates.length - 3}` : ''))}</td>
                  <td style={{ ...s.td, fontSize: 12, color: '#666' }}>{co.handler || '—'}</td>
                  <td style={{ ...s.td, fontSize: 11, color: '#aaa' }}>{co.lastModified ? new Date(co.lastModified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SERVICE TYPE COUNT POPUP */}
      {servicePopup && (() => {
        const counts = {};
        ALL_SERVICES.forEach(st => { counts[st] = 0; });
        companies.forEach(co => {
          (co.serviceType || []).forEach(st => {
            if (counts[st] !== undefined) counts[st]++;
            else counts[st] = 1;
          });
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const total = sorted.reduce((sum, [, c]) => sum + c, 0);
        return (
          <div data-testid="service-type-popup-overlay" onClick={() => setServicePopup(false)} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998,
            background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(3px)'
          }}>
            <div data-testid="service-type-popup" onClick={e => e.stopPropagation()} style={{
              width: 520, maxHeight: '80vh', background: '#fff', borderRadius: 14,
              boxShadow: '0 16px 48px rgba(0,0,0,.18)', overflow: 'hidden',
              display: 'flex', flexDirection: 'column'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 22px 14px', borderBottom: '1px solid #f0ece4'
              }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: C.navy }}>Service Type Breakdown</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>{ALL_SERVICES.length} service types &middot; {total} total assignments across {companies.length} companies</div>
                </div>
                <div
                  data-testid="service-popup-close"
                  onClick={() => setServicePopup(false)}
                  style={{
                    width: 30, height: 30, borderRadius: 8, border: '1px solid #e2ddd6', background: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    color: '#888', cursor: 'pointer', fontFamily: 'inherit'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#c62828'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#c62828'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#e2ddd6'; }}
                >&times;</div>
              </div>
              {/* Table */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, background: '#faf8f5', zIndex: 2 }}>
                      <th style={{ padding: '10px 14px 10px 22px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px' }}>#</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px' }}>Service Type</th>
                      <th style={{ padding: '10px 22px 10px 8px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px' }}>Companies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(([st, count], i) => {
                      const maxCount = sorted[0][1] || 1;
                      const barWidth = count > 0 ? Math.max(4, (count / maxCount) * 100) : 0;
                      return (
                        <tr key={st} style={{ borderBottom: '1px solid #f5f2ec' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f0f6ff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <td style={{ padding: '9px 14px 9px 22px', fontSize: 11, color: '#bbb', fontWeight: 600, width: 36 }}>{i + 1}</td>
                          <td style={{ padding: '9px 8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: count > 0 ? C.navy : '#aaa', whiteSpace: 'nowrap' }}>{st}</span>
                              {count > 0 && (
                                <div style={{ flex: 1, height: 6, background: '#f0ece4', borderRadius: 3, overflow: 'hidden', minWidth: 40 }}>
                                  <div style={{
                                    width: `${barWidth}%`, height: '100%', borderRadius: 3,
                                    background: i < 3 ? '#e8a030' : i < 10 ? '#5b82e0' : '#a0b8f0',
                                    transition: 'width .3s ease'
                                  }} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '9px 22px 9px 8px', textAlign: 'right' }}>
                            <span style={{
                              display: 'inline-block', minWidth: 28, padding: '3px 10px', borderRadius: 20,
                              fontSize: 12, fontWeight: 700, textAlign: 'center',
                              background: count > 0 ? (i < 3 ? '#fff8e1' : '#f0f4f9') : '#fafafa',
                              color: count > 0 ? (i < 3 ? '#e65100' : '#1a3a8b') : '#ccc',
                              border: `1px solid ${count > 0 ? (i < 3 ? '#ffe082' : '#dde3ed') : '#eee'}`
                            }}>{count}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TOP 3 RECOMMENDED POPUP */}
      {recsOpen && (() => {
        const INDUSTRY_MAP = {
          'Food': ['Food Delivery','Grocery Delivery','Catering Delivery','Floral/Perishable'],
          'Package Delivery': ['Package/Parcel Delivery','E-commerce Returns/Reverse Logistics','Document/Legal Courier','Newspaper/Publication'],
          'Rideshare': ['Rideshare','NEMT/Senior Transport','Child Transport'],
          'Freight': ['Freight (Non-CDL)'],
          'Medical': ['Medical/Pharmacy (Rx)','Blood/Specimen/Lab Courier','Organ/Tissue Transport'],
          'Cannabis Delivery': ['Cannabis Delivery'], 'Pet Transport': ['Pet Transport'],
          'Senior Services': ['NEMT/Senior Transport'], 'Vehicle Transport': ['Vehicle Transport','Moving/Hauling'],
          'Gig Tasks': ['Field Photography/Gig Tasks','Job Board/Contract Platform'],
        };
        const userInds = user?.industries || [];
        const userVehs = user?.vehicles || [];
        const activeNames = new Set(companies.filter(c => c.status === 'Active').map(c => c.name));
        const matchKeywords = new Set();
        userInds.forEach(ind => (INDUSTRY_MAP[ind] || []).forEach(k => matchKeywords.add(k)));
        const scored = companies.filter(c => !activeNames.has(c.name)).map(co => {
          let score = 0;
          (co.serviceType || []).forEach(st => { if (matchKeywords.has(st)) score += 3; });
          (co.vehicles || []).forEach(v => { if (userVehs.includes(v)) score += 2; });
          if (['Offered','Applied','Waiting','Researching'].includes(co.status)) score += 1;
          return { ...co, score };
        }).filter(c => c.score > 0).sort((a, b) => b.score - a.score);
        let recs = scored.slice(0, 3);
        if (recs.length < 3) {
          const remaining = companies.filter(c => !activeNames.has(c.name) && !recs.find(r => r.id === c.id)).slice(0, 3 - recs.length);
          recs = [...recs, ...remaining];
        }
        recs = recs.slice(0, 3);

        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(30,45,90,.3)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setRecsOpen(false)}>
            <div data-testid="recommendations-section" onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:14, boxShadow:'0 12px 40px rgba(0,0,0,.18)', width:440, overflow:'hidden' }}>
              <div style={{ background:'#2e7d32', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>Top 3 Recommended</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginTop:2 }}>Selected by AI based on your profile, location & vehicle type.</div>
                </div>
                <span onClick={() => setRecsOpen(false)} style={{ color:'#fff', fontSize:18, cursor:'pointer', fontWeight:700 }}>✕</span>
              </div>
              <div style={{ padding:16 }}>
                {recs.length === 0 ? (
                  <div style={{ padding:20, textAlign:'center', color:'#aaa', fontStyle:'italic', fontSize:13 }}>No recommendations available — complete your profile in Settings.</div>
                ) : recs.map(co => (
                  <div key={co.id} data-testid={`rec-card-${co.id}`} onClick={() => { setSelected(co); setRecsOpen(false); }}
                    style={{ background:'#fafaf7', border:'1px solid #e8e2d8', borderRadius:10, padding:'12px 14px', marginBottom:10, cursor:'pointer', display:'flex', gap:12, alignItems:'flex-start' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#5b82e0'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e8e2d8'}
                  >
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, color:C.navy, fontSize:14, marginBottom:5 }}>{co.name}</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:5 }}>
                        {(co.serviceType || []).slice(0, 3).map(st => (
                          <span key={st} style={{ padding:'2px 7px', borderRadius:4, fontSize:10, fontWeight:600, background:'#edf7ee', color:'#2e7d32' }}>{st}</span>
                        ))}
                      </div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:5 }}>
                        {(co.vehicles || []).slice(0, 3).map(v => (
                          <span key={v} style={{ padding:'2px 7px', borderRadius:4, fontSize:10, fontWeight:500, background:'#eef3fd', color:'#1565c0' }}>{v}</span>
                        ))}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11 }}>
                        <StatusBadge status={co.status} />
                        <span style={{ color:'#aaa' }}>{co.handler || ''}</span>
                      </div>
                    </div>
                    <span style={{ fontSize:16, color:'#bbb', flexShrink:0, marginTop:4 }}>→</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* CARD DRAWER */}
      {selected && (
        <div style={{ position: 'relative' }}>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(30,45,90,.18)', zIndex: 100 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, width: 500, height: '100vh', background: C.cream, borderLeft: '1px solid #d0cbc2', overflowY: 'auto', zIndex: 101 }}>
            <CompanyCard
              company={selected}
              activities={activities}
              handlers={handlers}
              onHandlersChange={setHandlers}
              onSave={handleSave}
              onDelete={handleDeleteCompany}
              onLogActivity={handleLogActivity}
              onClose={() => setSelected(null)}
            />
          </div>
        </div>
      )}

      {/* ADD COMPANY MODAL */}
      {addOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px 0' }}>
          <AddCompanyForm handlers={handlers} onHandlersChange={setHandlers} onSave={handleAddCompany} onClose={() => setAddOpen(false)} />
        </div>
      )}
    </div>
  );
}

function AddCompanyForm({ handlers, onHandlersChange, onSave, onClose }) {
  const blank = { name:'', website:'', mainPhone:'', activeStates:[], workModel:[], serviceType:[], vehicles:[], status:'', priority:'Medium', handler: handlers[0]||'King Solomon', followUp:'', signupUrl:'', notes:'', contactName:'', contactTitle:'', contactEmail:'', contactPhone:'', contactLinkedin:'', contactMethod:'Email', vehicleOther:'', serviceOther:'' };
  const [form, setForm] = useState(blank);
  const [stateSearch, setStateSearch] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  const upd = (k,v) => setForm(f=>({...f,[k]:v}));
  const toggleArr = (k,v) => { const a = form[k]||[]; upd(k, a.includes(v)?a.filter(x=>x!==v):[...a,v]); };
  const activeSet = new Set(form.activeStates?.includes('ALL_50') ? ALL_STATES : form.activeStates);

  const aiAutofill = async () => {
    if (!form.name.trim()) { alert('Enter a company name first'); return; }
    setAiLoading(true);
    try {
      const { aiCompanyAutofill } = await import('./api');
      const json = await aiCompanyAutofill(form.name.trim());
      if (json.success && json.data) {
        const d = json.data;
        setForm(f => ({
          ...f,
          name: d.name || f.name,
          website: d.website || f.website,
          mainPhone: d.mainPhone || f.mainPhone,
          contactName: d.contactName || f.contactName,
          contactTitle: d.contactTitle || f.contactTitle,
          contactEmail: d.contactEmail || f.contactEmail,
          contactPhone: d.contactPhone || f.contactPhone,
          contactLinkedin: d.contactLinkedin || f.contactLinkedin,
          preferredContact: d.preferredContact || f.contactMethod,
          contactMethod: d.preferredContact || f.contactMethod,
          serviceType: (d.serviceType && d.serviceType.length > 0) ? d.serviceType : f.serviceType,
          vehicles: (d.vehicles && d.vehicles.length > 0) ? d.vehicles : f.vehicles,
          workModel: (d.workModel && d.workModel.length > 0) ? d.workModel : f.workModel,
          activeStates: (d.activeStates && d.activeStates.length > 0) ? d.activeStates : f.activeStates,
          signupUrl: d.signUpUrl || f.signupUrl,
          videoUrl: d.videoUrl || f.videoUrl,
          notes: d.notes || f.notes,
        }));
      } else {
        alert(json.message || 'AI could not fetch data. Fill manually.');
      }
    } catch (e) {
      alert('AI auto-fill failed. Please fill manually.');
    }
    setAiLoading(false);
  };

  const fc = { background:'#f2ede6', border:'1px solid #ddd8d0', borderRadius:10, padding:'15px 15px 8px', marginBottom:14 };
  const fct = { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:'#2c4a8f', marginBottom:14 };
  const lbl = { display:'block', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.6px', color:'#555', marginBottom:5 };
  const inp = { width:'100%', padding:'9px 11px', border:'1px solid #ccc8c0', borderRadius:7, fontSize:13, fontFamily:'inherit', background:'#fff', color:'#111', marginBottom:12, boxSizing:'border-box', outline:'none' };
  const filteredStates = ALL_STATES.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase()));

  return (
    <div style={{ background:'#fff', width:'100%', maxWidth:640, borderRadius:12, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,.2)' }}>
      <div style={{ background:C.navy, color:'#fff', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:17, fontWeight:700 }}>Add New Company</span>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#fff', fontSize:20, cursor:'pointer' }}>✕</button>
      </div>
      <div style={{ background:'#e8e4dc', padding:'16px 16px 0', maxHeight:'80vh', overflowY:'auto' }}>

        {/* Company Info */}
        <div style={fc}>
          <div style={fct}>Company Info</div>
          <label style={lbl}>Company Name *</label>
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            <input value={form.name} onChange={e=>upd('name',e.target.value)} placeholder="e.g. Amazon Flex" style={{ ...inp, flex:1, marginBottom:0 }} />
            <button data-testid="ai-autofill-btn" onClick={aiAutofill} disabled={aiLoading} style={{ padding:'9px 16px', border:'none', borderRadius:7, background: aiLoading ? '#aaa' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontSize:12, fontWeight:700, cursor: aiLoading?'not-allowed':'pointer', fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0 }}>
              {aiLoading ? '⏳ Filling...' : '✨ AI Auto-fill'}
            </button>
          </div>
          <label style={lbl}>Website</label>
          <input value={form.website} onChange={e=>upd('website',e.target.value)} placeholder="e.g. flex.amazon.com" style={inp} />
          <label style={lbl}>Main Company Line</label>
          <input value={form.mainPhone} onChange={e=>upd('mainPhone',e.target.value)} placeholder="1-800-000-0000" style={inp} />
          <label style={lbl}>Active States</label>
          <div style={{ marginBottom:12 }}>
            <div style={{ display:'flex', gap:8, marginBottom:7 }}>
              <div onClick={() => upd('activeStates', activeSet.size>=50?[]:['ALL_50'])} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20, border:`1.5px solid ${activeSet.size>=50?'#5b82e0':'#ccc8c0'}`, background:activeSet.size>=50?'#e8f0fd':'#fff', cursor:'pointer', fontSize:12, fontWeight:700, color:activeSet.size>=50?'#1a3a8b':'#555', userSelect:'none' }}>
                <input type="checkbox" checked={activeSet.size>=50} onChange={()=>{}} style={{ width:12, height:12 }} /> All 50 States
              </div>
              <button onClick={()=>upd('activeStates',[])} style={{ padding:'5px 12px', border:'1.5px solid #ccc8c0', borderRadius:20, fontSize:11, fontWeight:700, color:'#c62828', background:'#fff', cursor:'pointer' }}>Clear All</button>
            </div>
            <input value={stateSearch} onChange={e=>setStateSearch(e.target.value)} placeholder="🔍 Search states..." style={{ ...inp, marginBottom:6 }} />
            <div style={{ background:'#fff', border:'1px solid #ccc8c0', borderRadius:7, maxHeight:160, overflowY:'auto', marginBottom:7 }}>
              {filteredStates.map(s => (
                <div key={s} onClick={()=>{const a=new Set(activeSet);a.has(s)?a.delete(s):a.add(s);upd('activeStates',[...a]);}} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', cursor:'pointer', background:activeSet.has(s)?'#e8f0fd':'#fff', fontSize:13, color:activeSet.has(s)?'#1a3a8b':'#222', userSelect:'none' }}>
                  <input type="checkbox" checked={activeSet.has(s)} onChange={()=>{}} style={{ width:13, height:13 }} />
                  <strong>{s}</strong> — {({AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'Washington D.C.'})[s]||s}
                </div>
              ))}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:4, padding:'5px 7px', border:'1px dashed #c0bab0', borderRadius:7, background:'#faf8f4', minHeight:28 }}>
              {activeSet.size===0 && <span style={{ fontSize:11, color:'#bbb', fontStyle:'italic' }}>None selected</span>}
              {[...activeSet].sort().map(s => <span key={s} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:20, background:'#e8f0fd', border:'1px solid #a0b8f0', color:'#1a3a8b', fontSize:10, fontWeight:700 }}>{s}</span>)}
            </div>
          </div>
        </div>

        {/* Work Model */}
        <div style={fc}>
          <div style={fct}>Work Model * <span style={{ color:'#c0392b', fontSize:9 }}>Select all that apply</span></div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 }}>
            {[{m:'App / On Demand',cls:'app'},{m:'Route',cls:'route'},{m:'Fleet',cls:'fleet'},{m:'Other',cls:'other'}].map(({m,cls})=>{
              const on=(form.workModel||[]).includes(m);
              const colors={app:{on:'#e8f0fd',onB:'#5b82e0',onT:'#1a3a8b'},route:{on:'#e6f5ea',onB:'#6abf80',onT:'#1a5c2a'},fleet:{on:'#fef3e6',onB:'#e0b060',onT:'#7a4a0a'},other:{on:'#f0e8f8',onB:'#b080d8',onT:'#4a1a7a'}};
              const c=colors[cls];
              return <div key={m} onClick={()=>toggleArr('workModel',m)} style={{ padding:'7px 14px', borderRadius:20, fontSize:12, fontWeight:700, border:`1.5px solid ${on?c.onB:'#ccc8c0'}`, background:on?c.on:'#fff', color:on?c.onT:'#666', cursor:'pointer', userSelect:'none' }}>{m}</div>;
            })}
          </div>
          <div style={{ background:'#fff', border:'1px solid #ddd8d0', borderRadius:8, padding:'9px 11px', marginBottom:12 }}>
            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:'#aaa', marginBottom:8 }}>Work Model Key</div>
            {[{l:'App / On Demand',bg:'#e8f0fd',b:'#a0b8f0',t:'#1a3a8b',d:'Open app, accept orders, no schedule.',ex:'DoorDash, GoPuff, Favor, Uber'},
              {l:'Route',bg:'#e6f5ea',b:'#90c8a0',t:'#1a5c2a',d:'Assigned block or territory, end to end.',ex:'Amazon Flex, Better Trucks, OnTrac'},
              {l:'Fleet',bg:'#fef3e6',b:'#e8c080',t:'#7a4a0a',d:'Dispatch network. Volume commitments.',ex:'Curri, Cargomatic, USPack'},
              {l:'Other',bg:'#f0e8f8',b:'#c0a0e0',t:'#4a1a7a',d:'Wraps, rentals, driveaway, mystery shops.',ex:'Turo, Wrapify, Gigwalk'},
            ].map(fn=>(
              <div key={fn.l} style={{ display:'flex', alignItems:'flex-start', gap:7, marginBottom:5 }}>
                <span style={{ flexShrink:0, padding:'2px 8px', borderRadius:20, fontSize:8, fontWeight:700, border:`1.5px solid ${fn.b}`, background:fn.bg, color:fn.t, whiteSpace:'nowrap' }}>{fn.l}</span>
                <div style={{ fontSize:9, color:'#666', lineHeight:1.4 }}>{fn.d} <span style={{ color:'#aaa', fontStyle:'italic' }}>{fn.ex}</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* Service Type */}
        <div style={fc}>
          <div style={fct}>Service Type * <span style={{ color:'#c0392b', fontSize:9 }}>Select all that apply</span></div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6, marginBottom:12 }}>
            {ALL_SERVICES.map(s => { const on=(form.serviceType||[]).includes(s); return <div key={s} onClick={()=>toggleArr('serviceType',s)} style={{ padding:'6px 5px', borderRadius:7, fontSize:10, fontWeight:500, border:`1.5px solid ${on?'#5b82e0':'#ccc8c0'}`, background:on?'#e8f0fd':'#fff', color:on?'#1a3a8b':'#666', cursor:'pointer', textAlign:'center', userSelect:'none' }}>{s}</div>; })}
          </div>
        </div>

        {/* Vehicles */}
        <div style={fc}>
          <div style={fct}>Vehicles Accepted * <span style={{ color:'#c0392b', fontSize:9 }}>Select all that apply</span></div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6, marginBottom:12 }}>
            {ALL_VEHICLES.map(v => { const on=(form.vehicles||[]).includes(v); return <div key={v} onClick={()=>toggleArr('vehicles',v)} style={{ padding:'6px 5px', borderRadius:7, fontSize:10, fontWeight:500, border:`1.5px solid ${on?'#6abf80':'#ccc8c0'}`, background:on?'#e6f5ea':'#fff', color:on?'#1a5c2a':'#666', cursor:'pointer', textAlign:'center', userSelect:'none' }}>{v}</div>; })}
          </div>
        </div>

        {/* Company Personnel */}
        <div style={fc}>
          <div style={fct}>Company Personnel</div>
          <p style={{ fontSize:10, color:'#999', fontStyle:'italic', marginBottom:11, marginTop:-10 }}>The specific person you contact to apply or sign up.</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[['contactName','Contact Person *','Full name'],['contactTitle','Job Title','e.g. Regional Manager'],['contactEmail','Direct Email','contact@company.com'],['contactPhone','Direct Line','+1 (555) 000-0000']].map(([k,l,ph])=>(
              <div key={k}><label style={lbl}>{l}</label><input value={form[k]} onChange={e=>upd(k,e.target.value)} placeholder={ph} style={inp} /></div>
            ))}
          </div>
          <label style={lbl}>LinkedIn / Social URL</label>
          <input value={form.contactLinkedin} onChange={e=>upd('contactLinkedin',e.target.value)} placeholder="linkedin.com/in/name" style={inp} />
          <label style={lbl}>Preferred Method of Contact</label>
          <select value={form.contactMethod} onChange={e=>upd('contactMethod',e.target.value)} style={inp}>
            {CONTACT_METHODS.map(m=><option key={m}>{m}</option>)}
          </select>
        </div>

        {/* Status & Assignment */}
        <div style={fc}>
          <div style={fct}>Status & Assignment</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label style={lbl}>Status</label><select value={form.status} onChange={e=>upd('status',e.target.value)} style={inp}><option value="" disabled>Select one</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
            <div><label style={lbl}>Priority</label><select value={form.priority} onChange={e=>upd('priority',e.target.value)} style={inp}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></div>
          </div>
          <label style={lbl}>Assign to Handler</label>
          <div style={{ marginBottom:12 }}>
            <HandlerCombobox value={form.handler} handlers={handlers} onChange={v=>upd('handler',v)} onHandlersChange={onHandlersChange} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label style={lbl}>Follow-up Date</label><input type="date" value={form.followUp} onChange={e=>upd('followUp',e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Sign-Up URL</label><input value={form.signupUrl} onChange={e=>upd('signupUrl',e.target.value)} placeholder="Direct apply link" style={inp} /></div>
          </div>
          <label style={lbl}>Notes</label>
          <textarea value={form.notes} onChange={e=>upd('notes',e.target.value)} placeholder="Pay rates, requirements, tips..." rows={3} style={{ ...inp, resize:'vertical' }} />
        </div>

      </div>
      <div style={{ background:'#fff', borderTop:'1px solid #ddd8d0', padding:'13px 20px', display:'flex', justifyContent:'flex-end', gap:10 }}>
        <button onClick={onClose} style={{ padding:'9px 20px', border:'1.5px solid #ccc8c0', borderRadius:8, background:'#fff', color:'#555', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
        <button onClick={()=>{ if(!form.name.trim()){alert('Company Name is required.');return;} if(!form.status){alert('Please select a Status.');return;} onSave(form); }} style={{ padding:'9px 24px', border:'none', borderRadius:8, background:C.navy, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Save Company</button>
      </div>
    </div>
  );
}
