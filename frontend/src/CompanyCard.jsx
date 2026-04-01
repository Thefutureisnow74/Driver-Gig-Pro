import React, { useState, useRef, useCallback } from 'react';
import { C, ALL_STATES, ALL_MODELS, ALL_SERVICES, ALL_VEHICLES, STATUSES, PRIORITIES, CONTACT_METHODS, LOG_TYPES, LOG_OUTCOMES } from './theme';
import { Chip, GreenChip, StatusPill, PriorityPill, TanPill, SectionLabel, Divider, BtnPrimary } from './components';
import HandlerCombobox from './HandlerCombobox';

const AI_MSGS = {
  Researching: 'Research phase. Gather intel on pay rates, vehicle requirements, and local availability before applying.',
  Applied:     'Application submitted. If no response in 5 business days, follow up with the contact directly.',
  Waiting:     'Follow up within 24–48 hours. They showed interest — don\'t let momentum fade. Mention your vehicle availability.',
  Offered:     'Offer received! Review the contract terms carefully. Check pay rates, vehicle requirements, and exclusivity clauses before accepting.',
  Active:      'Active gig. Track earnings weekly. Look for peak windows in your active states.',
  Overdue:     'OVERDUE — This company needs immediate follow-up. Contact them today.',
};

export default function CompanyCard({ company, activities, handlers, onHandlersChange, onSave, onDelete, onLogActivity, onClose }) {
  const [form, setForm] = useState({ ...company });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({ type: 'Phone', outcome: 'Interested', handler: handlers[0] || 'King Solomon', notes: '', nextAction: '' });
  const [videoModal, setVideoModal] = useState(false);
  const [videoExpanded, setVideoExpanded] = useState(false);

  // Documents state
  const [docs, setDocs] = useState(company.documents || []);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const photoRef = useRef(null);

  const addFiles = useCallback((fileList) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    const newDocs = [];
    let loaded = 0;
    Array.from(fileList).forEach(file => {
      const ext = file.name.rsplit ? '' : (file.name.split('.').pop() || '').toLowerCase();
      const isImage = ['jpg','jpeg','png','gif','webp','bmp','svg'].includes(ext);
      const id = 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);

      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newDocs.push({ id, name: file.name, size: file.size, isImage: true, ext, dataUrl: e.target.result, uploadedAt: new Date().toISOString() });
          loaded++;
          if (loaded === fileList.length) { setDocs(prev => [...newDocs, ...prev]); setUploading(false); setDirty(true); }
        };
        reader.readAsDataURL(file);
      } else {
        newDocs.push({ id, name: file.name, size: file.size, isImage: false, ext, dataUrl: null, uploadedAt: new Date().toISOString() });
        loaded++;
        if (loaded === fileList.length) { setDocs(prev => [...newDocs, ...prev]); setUploading(false); setDirty(true); }
      }
    });
  }, []);

  const removeDoc = (docId) => { setDocs(prev => prev.filter(d => d.id !== docId)); setDirty(true); };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const FILE_ICONS = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', csv: '📊', txt: '📃', zip: '📦', rar: '📦' };

  const update = (key, val) => { setForm(f => ({ ...f, [key]: val })); setDirty(true); };

  const toggleArr = (key, val) => {
    const arr = form[key] || [];
    const next = arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
    update(key, next);
  };

  const toggleState = (s) => {
    const arr = form.activeStates || [];
    if (arr.includes('ALL_50')) { const next = ALL_STATES.filter(x => x !== s); update('activeStates', next); }
    else { const next = arr.includes(s) ? arr.filter(v => v !== s) : [...arr, s]; update('activeStates', next); }
  };

  const activeSet = new Set(form.activeStates?.includes('ALL_50') ? ALL_STATES : (form.activeStates || []));

  const statesSummary = () => {
    if (!form.activeStates?.length) return 'None selected';
    if (form.activeStates.includes('ALL_50')) return 'All 50 States';
    if (activeSet.size >= 50) return 'All 50 States';
    if (activeSet.size <= 4) return [...activeSet].sort().join(', ');
    return [...activeSet].sort().slice(0,3).join(', ') + ` + ${activeSet.size - 3} more`;
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ ...form, documents: docs });
      setDirty(false);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  const submitLog = () => {
    if (!logForm.notes.trim()) { alert('Please add notes about this activity.'); return; }
    onLogActivity({ ...logForm, companyId: company.id, companyName: form.name });
    setLogForm({ type: 'Phone', outcome: 'Interested', handler: handlers[0], notes: '', nextAction: '' });
    setLogOpen(false);
    setDirty(true);
  };

  const myActivities = activities.filter(a => a.companyId === company.id);

  const DOT_COLOR = { Phone: '#3d9a5c', Email: '#8a8478', Meeting: '#7b1fa2', Note: '#f59e0b' };
  const OUTCOME_BADGE = {
    Interested: { bg: '#d4eddb', color: '#1a5c2a' }, Pending: { bg: '#fef6d0', color: '#7a5000' },
    Callback: { bg: '#e3f2fd', color: '#1565c0' }, 'Left Voicemail': { bg: '#f3e5f5', color: '#6a1b9a' },
    'No Answer': { bg: '#f5f5f5', color: '#666' }, Declined: { bg: '#ffcdd2', color: '#c62828' },
  };

  const inp = { width: '100%', padding: '6px 8px', border: '1.5px solid #ddd', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', background: '#fff', color: '#111', outline: 'none', boxSizing: 'border-box' };
  const lbl = { display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#888', marginBottom: 4 };
  // Inline editable field that looks like text until focused
  const inlineInp = { background: 'transparent', border: '1px solid transparent', borderRadius: 5, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', padding: '2px 4px', transition: 'border-color .15s' };

  return (
    <div style={{ background: '#fff', minHeight: '100%' }}>

      {/* SAVE BAR */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e2d8', padding: '8px 16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 50 }}>
        {savedMsg && <span style={{ fontSize: 11, color: '#3d9a5c', fontWeight: 700 }}>✓ Changes saved</span>}
        <button
          onClick={dirty && !saving ? save : undefined}
          style={{ padding: '7px 20px', background: dirty ? C.navy : '#ccc', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: dirty ? 'pointer' : 'default', fontFamily: 'inherit' }}
        >
          {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
        </button>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888', padding: 2 }}>✕</button>
      </div>

      {/* HEADER — editable name + status dropdown top-right */}
      <div style={{ padding: '16px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 3 }}>
          <input
            value={form.name}
            onChange={e => update('name', e.target.value)}
            style={{ ...inlineInp, fontSize: 20, fontWeight: 700, color: '#111', letterSpacing: '-.3px', flex: 1 }}
            onFocus={e => e.target.style.borderColor = '#5b82e0'}
            onBlur={e => e.target.style.borderColor = 'transparent'}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#888', marginBottom: 3 }}>Status</span>
            <select
              data-testid="status-dropdown-header"
              value={form.status}
              onChange={e => update('status', e.target.value)}
              style={{ padding: '5px 10px', border: '1.5px solid #ddd', borderRadius: 7, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', background: '#fff', color: '#111', outline: 'none' }}
            >
              {!form.status && <option value="" disabled>Select one</option>}
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {form.website && (
          <a href={form.website.startsWith('http') ? form.website : `https://${form.website}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.blue, textDecoration: 'none', marginBottom: 6, display: 'inline-block' }}>{form.website}</a>
        )}

        {/* Compact chips: service types + vehicles on one line */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {(form.serviceType || []).map(s => <TanPill key={s}>{s}</TanPill>)}
          {(form.vehicles || []).map(v => (
            <span key={v} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 500, background: '#e6f5ea', border: '1.5px solid #90c8a0', color: '#1a5c2a' }}>{v}</span>
          ))}
        </div>
        <Divider />
      </div>

      {/* COMPANY DETAILS */}
      <div style={{ padding: '0 18px 5px' }}><SectionLabel>Company Details</SectionLabel></div>
      <div style={{ background: '#faf8f4', border: '1px solid #e8e2d8', borderRadius: 9, padding: '10px 13px', margin: '0 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 0' }}>
          <span style={{ width: 16, textAlign: 'center', fontSize: 12, color: '#aaa', flexShrink: 0 }}>🌐</span>
          <input
            value={form.website || ''}
            onChange={e => update('website', e.target.value)}
            placeholder="company-website.com"
            style={{ ...inlineInp, fontSize: 12, color: C.blue, background: 'transparent' }}
            onFocus={e => e.target.style.borderColor = '#5b82e0'}
            onBlur={e => e.target.style.borderColor = 'transparent'}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 0' }}>
          <span style={{ width: 16, textAlign: 'center', fontSize: 12, color: '#aaa', flexShrink: 0 }}>📞</span>
          <input
            value={form.mainPhone || ''}
            onChange={e => update('mainPhone', e.target.value)}
            placeholder="Main phone number"
            style={{ ...inlineInp, fontSize: 12, color: '#222', background: 'transparent' }}
            onFocus={e => e.target.style.borderColor = '#5b82e0'}
            onBlur={e => e.target.style.borderColor = 'transparent'}
          />
          <span style={{ fontSize: 10, color: '#aaa', flexShrink: 0 }}>Main Line</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 0' }}>
          <span style={{ width: 16, textAlign: 'center', fontSize: 12, color: '#aaa', flexShrink: 0 }}>📍</span>
          <span style={{ fontSize: 12, color: '#222' }}>Active in: <strong>{statesSummary()}</strong></span>
        </div>
      </div>

      {/* CONTACT PERSONNEL */}
      <div style={{ padding: '0 18px 5px' }}><SectionLabel>Contact Personnel</SectionLabel></div>
      <div style={{ background: '#faf8f4', border: '1px solid #e8e2d8', borderRadius: 9, padding: '10px 13px', margin: '0 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <input
            value={form.contactName || ''}
            onChange={e => update('contactName', e.target.value)}
            placeholder="Contact full name"
            style={{ ...inlineInp, fontSize: 13, fontWeight: 700, color: '#1a1a1a', flex: 1, background: 'transparent' }}
            onFocus={e => e.target.style.borderColor = '#5b82e0'}
            onBlur={e => e.target.style.borderColor = 'transparent'}
          />
          <span style={{ fontSize: 11, color: '#bbb', flexShrink: 0 }}>·</span>
          <input
            value={form.contactTitle || ''}
            onChange={e => update('contactTitle', e.target.value)}
            placeholder="Job title"
            style={{ ...inlineInp, fontSize: 11, color: '#888', flex: 1, background: 'transparent' }}
            onFocus={e => e.target.style.borderColor = '#5b82e0'}
            onBlur={e => e.target.style.borderColor = 'transparent'}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 11, width: 14, color: '#bbb', flexShrink: 0 }}>✉</span>
          <input
            value={form.contactEmail || ''}
            onChange={e => update('contactEmail', e.target.value)}
            placeholder="contact@company.com"
            style={{ ...inlineInp, fontSize: 12, color: C.blue, flex: 1, background: 'transparent' }}
            onFocus={e => e.target.style.borderColor = '#5b82e0'}
            onBlur={e => e.target.style.borderColor = 'transparent'}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 11, width: 14, color: '#bbb', flexShrink: 0 }}>📞</span>
          <input
            value={form.contactPhone || ''}
            onChange={e => update('contactPhone', e.target.value)}
            placeholder="Direct phone"
            style={{ ...inlineInp, fontSize: 12, color: '#333', flex: 1, background: 'transparent' }}
            onFocus={e => e.target.style.borderColor = '#5b82e0'}
            onBlur={e => e.target.style.borderColor = 'transparent'}
          />
          <span style={{ fontSize: 10, color: '#aaa', flexShrink: 0 }}>Direct</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 11, width: 14, color: '#bbb', flexShrink: 0 }}>in</span>
          <input
            value={form.contactLinkedin || ''}
            onChange={e => update('contactLinkedin', e.target.value)}
            placeholder="linkedin.com/in/name"
            style={{ ...inlineInp, fontSize: 12, color: C.blue, flex: 1, background: 'transparent' }}
            onFocus={e => e.target.style.borderColor = '#5b82e0'}
            onBlur={e => e.target.style.borderColor = 'transparent'}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, width: 14, color: '#bbb', flexShrink: 0 }}>💬</span>
          <select
            value={form.contactMethod || ''}
            onChange={e => update('contactMethod', e.target.value)}
            style={{ ...inlineInp, fontSize: 12, color: '#333', flex: 1, cursor: 'pointer', background: 'transparent' }}
            onFocus={e => e.target.style.borderColor = '#5b82e0'}
            onBlur={e => e.target.style.borderColor = 'transparent'}
          >
            <option value="">Select contact method</option>
            {CONTACT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* HANDLER / PRIORITY */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 18px 12px' }}>
        <div>
          <label style={lbl}>Handler</label>
          <HandlerCombobox value={form.handler} handlers={handlers} onChange={v => update('handler', v)} onHandlersChange={onHandlersChange} />
        </div>
        <div>
          <label style={lbl}>Priority</label>
          <select value={form.priority} onChange={e => update('priority', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* FOLLOW-UP + SIGNUP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 18px 12px' }}>
        <div><label style={lbl}>Follow-up Date</label><input type="date" value={form.followUp || ''} onChange={e => update('followUp', e.target.value)} style={inp} /></div>
        <div><label style={lbl}>Sign-Up URL</label><input type="text" value={form.signupUrl || ''} onChange={e => update('signupUrl', e.target.value)} placeholder="sign-up link" style={inp} /></div>
      </div>

      {/* YOUTUBE VIDEO */}
      <div style={{ padding: '0 18px 12px' }}>
        <label style={lbl}>YouTube Video</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="text" value={form.videoUrl || ''} onChange={e => update('videoUrl', e.target.value)} placeholder="https://youtube.com/watch?v=..." style={{ ...inp, flex: 1 }} />
          {form.videoUrl && (() => {
            const m = form.videoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (!m) return null;
            return (
              <div
                data-testid="video-play-btn"
                onClick={() => { setVideoModal(true); setVideoExpanded(false); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 7, background: '#FF0000', color: '#fff', fontSize: 14, cursor: 'pointer', flexShrink: 0 }}
                title="Play video"
              >▶</div>
            );
          })()}
        </div>
        {form.videoUrl && (() => {
          const m = form.videoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          if (!m) return null;
          return (
            <div
              onClick={() => { setVideoModal(true); setVideoExpanded(false); }}
              style={{ marginTop: 6, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2ddd6', cursor: 'pointer', position: 'relative' }}
            >
              <img src={`https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`} alt="Video thumbnail" style={{ width: '100%', display: 'block' }} />
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,.3)', transition: 'background .2s'
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,0,0,.9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 20, paddingLeft: 3
                }}>▶</div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* VIDEO POPUP MODAL */}
      {videoModal && form.videoUrl && (() => {
        const m = form.videoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (!m) return null;
        const modalW = videoExpanded ? '92vw' : '680px';
        const modalMaxW = videoExpanded ? '1600px' : '680px';
        return (
          <div data-testid="video-modal-overlay" onClick={() => setVideoModal(false)} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
            background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)', animation: 'fadeIn .2s ease'
          }}>
            <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
            <div data-testid="video-modal" onClick={e => e.stopPropagation()} style={{
              width: modalW, maxWidth: modalMaxW, background: '#1a1a1a', borderRadius: 14,
              overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.5)',
              transition: 'width .3s ease, max-width .3s ease'
            }}>
              {/* Modal Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', background: '#111'
              }}>
                <span style={{ color: '#ccc', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                  {form.name || 'Video'}
                </span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {/* Expand / Shrink */}
                  <button
                    data-testid="video-expand-btn"
                    onClick={() => setVideoExpanded(prev => !prev)}
                    title={videoExpanded ? 'Shrink' : 'Expand'}
                    style={{
                      width: 32, height: 32, borderRadius: 6, border: '1px solid #444',
                      background: '#222', color: '#ccc', fontSize: 16, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
                      transition: 'all .15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#333'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#222'; e.currentTarget.style.color = '#ccc'; }}
                  >{videoExpanded ? '⊟' : '⊞'}</button>
                  {/* Open on YouTube */}
                  <button
                    data-testid="video-youtube-btn"
                    onClick={() => window.open(form.videoUrl, '_blank', 'noopener,noreferrer')}
                    title="Open on YouTube"
                    style={{
                      width: 32, height: 32, borderRadius: 6, border: '1px solid #444',
                      background: '#222', color: '#ccc', fontSize: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
                      transition: 'all .15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#c00'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#c00'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#222'; e.currentTarget.style.color = '#ccc'; e.currentTarget.style.borderColor = '#444'; }}
                  >YT</button>
                  {/* Close */}
                  <button
                    data-testid="video-close-btn"
                    onClick={() => setVideoModal(false)}
                    title="Close"
                    style={{
                      width: 32, height: 32, borderRadius: 6, border: '1px solid #444',
                      background: '#222', color: '#ccc', fontSize: 18, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
                      transition: 'all .15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#c00'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#c00'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#222'; e.currentTarget.style.color = '#ccc'; e.currentTarget.style.borderColor = '#444'; }}
                  >×</button>
                </div>
              </div>
              {/* Video Player */}
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, background: '#000' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${m[1]}?autoplay=1`}
                  title="YouTube video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* NOTES */}
      <div style={{ padding: '0 18px 12px' }}>
        <label style={lbl}>Notes</label>
        <textarea value={form.notes || ''} onChange={e => update('notes', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical', minHeight: 52 }} />
      </div>

      <Divider margin="0 18px 12px" />

      {/* WORK MODEL */}
      <div style={{ padding: '0 18px 12px' }}>
        <SectionLabel>Work Model — click to toggle</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {ALL_MODELS.map(m => {
            const active = (form.workModel || []).includes(m);
            const styles = {
              'App / On Demand': { bg:'#e8f0fd', border:'#a0b8f0', color:'#1a3a8b' },
              'Route':           { bg:'#e6f5ea', border:'#90c8a0', color:'#1a5c2a' },
              'Fleet':           { bg:'#fef3e6', border:'#e8c080', color:'#7a4a0a' },
              'Other':           { bg:'#f0e8f8', border:'#c0a0e0', color:'#4a1a7a' },
            };
            const off = { bg:'#f5f5f2', border:'#e0ddd8', color:'#bbb' };
            const col = active ? styles[m] : off;
            return (
              <span key={m} onClick={() => toggleArr('workModel', m)} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', userSelect: 'none', background: col.bg, border: `1.5px solid ${col.border}`, color: col.color }}>
                {m}
              </span>
            );
          })}
        </div>
      </div>

      {/* SERVICE TYPE */}
      <div style={{ padding: '0 18px 12px' }}>
        <SectionLabel>Service Type — click to toggle</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {ALL_SERVICES.map(s => <Chip key={s} label={s} active={(form.serviceType || []).includes(s)} onToggle={() => toggleArr('serviceType', s)} />)}
        </div>
      </div>

      {/* VEHICLES */}
      <div style={{ padding: '0 18px 12px' }}>
        <SectionLabel>Vehicles Accepted — click to toggle</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {ALL_VEHICLES.map(v => <GreenChip key={v} label={v} active={(form.vehicles || []).includes(v)} onToggle={() => toggleArr('vehicles', v)} />)}
        </div>
      </div>

      {/* ACTIVE STATES */}
      <div style={{ padding: '0 18px 12px' }}>
        <SectionLabel>Active States — click to toggle</SectionLabel>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button
            onClick={() => { update('activeStates', activeSet.size >= 50 ? [] : ['ALL_50']); }}
            style={{ padding: '3px 10px', border: `1.5px solid ${activeSet.size >= 50 ? C.navy : '#ccc8c0'}`, borderRadius: 20, fontSize: 10, fontWeight: 700, color: activeSet.size >= 50 ? '#fff' : '#555', background: activeSet.size >= 50 ? C.navy : '#fff', cursor: 'pointer' }}
          >
            ✓ All 50
          </button>
          <button onClick={() => update('activeStates', [])} style={{ padding: '3px 10px', border: '1.5px solid #ccc8c0', borderRadius: 20, fontSize: 10, fontWeight: 700, color: '#555', background: '#fff', cursor: 'pointer' }}>
            Clear All
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {ALL_STATES.map(s => (
            <div key={s} onClick={() => toggleState(s)} style={{ padding: '3px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700, border: `1.5px solid ${activeSet.has(s) ? '#5b82e0' : '#e0ddd8'}`, background: activeSet.has(s) ? '#e8f0fd' : '#f5f5f2', color: activeSet.has(s) ? '#1a3a8b' : '#ccc', cursor: 'pointer', userSelect: 'none' }}>
              {s}
            </div>
          ))}
        </div>
      </div>

      <Divider margin="0 18px 12px" />

      {/* AI RECOMMENDATION */}
      <div style={{ margin: '0 18px 12px', background: '#eef2ff', border: '1.5px solid #c5d0f0', borderRadius: 9, padding: '10px 13px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#1a3a8b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>AI Recommendation</div>
        <div style={{ fontSize: 11, color: '#444', lineHeight: 1.55 }}>{AI_MSGS[form.status] || AI_MSGS.Researching}</div>
      </div>

      {/* LOG ACTIVITY BUTTON */}
      <div style={{ padding: '0 18px 14px' }}>
        <button
          onClick={() => setLogOpen(!logOpen)}
          style={{ display: 'block', width: '100%', padding: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', borderRadius: 8, border: 'none', background: logOpen ? '#6b7280' : C.navy, color: '#fff' }}
        >
          {logOpen ? '✕ Cancel' : '+ Log Activity'}
        </button>
      </div>

      {/* LOG FORM */}
      {logOpen && (
        <div style={{ margin: '0 18px 14px', background: '#f4f7fb', border: '1px solid #dde3ed', borderRadius: 9, padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 7 }}>
            <select value={logForm.type} onChange={e => setLogForm(f=>({...f,type:e.target.value}))} style={{ width: '100%', padding: '7px 8px', border: '1px solid #ccc', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', background: '#fff' }}>
              {LOG_TYPES.map(o => <option key={o}>{o}</option>)}
            </select>
            <select value={logForm.outcome} onChange={e => setLogForm(f=>({...f,outcome:e.target.value}))} style={{ width: '100%', padding: '7px 8px', border: '1px solid #ccc', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', background: '#fff' }}>
              {LOG_OUTCOMES.map(o => <option key={o}>{o}</option>)}
            </select>
            <HandlerCombobox
              value={logForm.handler}
              handlers={handlers}
              onChange={v => setLogForm(f=>({...f,handler:v}))}
              onHandlersChange={onHandlersChange}
            />
          </div>
          <textarea value={logForm.notes} onChange={e => setLogForm(f=>({...f,notes:e.target.value}))} placeholder="Notes about this interaction..." rows={3} style={{ width: '100%', padding: '7px 9px', border: '1px solid #ccc', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', background: '#fff', resize: 'vertical', marginBottom: 7, boxSizing: 'border-box' }} />
          <input type="text" value={logForm.nextAction} onChange={e => setLogForm(f=>({...f,nextAction:e.target.value}))} placeholder="Next action (e.g. Call back Mar 30)" style={{ width: '100%', padding: '7px 9px', border: '1px solid #ccc', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', background: '#fff', marginBottom: 9, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setLogOpen(false)} style={{ padding: '7px 13px', background: '#fff', color: '#666', border: '1px solid #ccc', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={submitLog} style={{ padding: '7px 18px', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: C.navy, color: '#fff', fontFamily: 'inherit' }}>Save Activity</button>
          </div>
        </div>
      )}

      {/* ACTIVITY TIMELINE */}
      <div style={{ padding: '0 18px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#888', marginBottom: 10 }}>Activity Timeline</div>
        {myActivities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 14, fontSize: 11, color: '#bbb', fontStyle: 'italic' }}>No activity logged yet.</div>
        ) : (
          myActivities.map((a, i) => (
            <div key={a.id} style={{ display: 'flex', gap: 10, marginBottom: 14, position: 'relative' }}>
              {i < myActivities.length - 1 && <div style={{ position: 'absolute', left: 5, top: 16, bottom: -8, width: 1.5, background: '#e0ddd8' }} />}
              <div style={{ width: 11, height: 11, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: DOT_COLOR[a.type] || '#8a8478' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{a.type}</span>
                  {a.outcome && (() => { const b = OUTCOME_BADGE[a.outcome] || { bg:'#f5f5f5',color:'#666' }; return <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: b.bg, color: b.color }}>{a.outcome}</span>; })()}
                  <span style={{ fontSize: 11, color: '#888' }}>{a.handler}</span>
                </div>
                <div style={{ fontSize: 10, color: '#aaa', marginBottom: 3 }}>{a.dateTime}</div>
                <div style={{ fontSize: 11, color: '#444', lineHeight: 1.45, marginBottom: 2 }}>{a.notes}</div>
                {a.nextAction && <div style={{ fontSize: 10, color: C.blue }}>→ Next: {a.nextAction}</div>}
              </div>
            </div>
          ))
        )}
      </div>

      <Divider margin="4px 18px 0" />

      {/* DOCUMENTS */}
      <div style={{ padding: '10px 18px 14px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#555', marginBottom: 9 }}>Documents</div>

        {/* Hidden file inputs */}
        <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
        <input ref={photoRef} type="file" accept="image/*" multiple capture="environment" style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />

        {/* Upload + Photo buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 9 }}>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: C.navy, color: '#fff', fontFamily: 'inherit', opacity: uploading ? 0.6 : 1 }}
          >Upload</button>
          <button
            onClick={() => photoRef.current?.click()}
            disabled={uploading}
            style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: C.navy, color: '#fff', fontFamily: 'inherit', opacity: uploading ? 0.6 : 1 }}
          >Photo</button>
        </div>

        {/* Drag & drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          style={{ border: `2px dashed ${dragOver ? '#5b82e0' : '#b0a898'}`, borderRadius: 8, padding: 13, textAlign: 'center', fontSize: 11, color: dragOver ? '#1a3a8b' : '#999', background: dragOver ? '#eef2ff' : '#faf8f5', transition: 'all .15s', cursor: 'pointer' }}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? 'Processing...' : 'Drag & drop files or click here'}
        </div>

        {/* File list */}
        {docs.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {docs.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid #f0ece4' }}>
                {/* Thumbnail or icon */}
                {d.isImage && d.dataUrl ? (
                  <img src={d.dataUrl} alt="" style={{ width: 36, height: 36, borderRadius: 5, objectFit: 'cover', flexShrink: 0, border: '1px solid #e2ddd6' }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 5, background: '#f0f4f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, border: '1px solid #e2ddd6' }}>
                    {FILE_ICONS[d.ext] || '📎'}
                  </div>
                )}
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                  <div style={{ fontSize: 10, color: '#aaa' }}>{formatSize(d.size)} · {d.ext.toUpperCase()}</div>
                </div>
                {/* Delete */}
                <button
                  onClick={() => removeDoc(d.id)}
                  style={{ background: 'none', border: '1px solid #ffcdd2', borderRadius: 5, color: '#c62828', fontSize: 11, padding: '3px 7px', cursor: 'pointer', flexShrink: 0 }}
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTNOTE */}
      <div style={{ background: '#faf8f4', borderTop: '1px solid #ede8e0', padding: '11px 18px' }}>
        <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.7px', color: '#aaa', marginBottom: 8 }}>Work Model Key</div>
        {[
          { label:'App / On Demand', bg:'#e8f0fd', border:'#a0b8f0', text:'#1a3a8b', desc:'Open the app, accept orders, get paid per delivery. No schedule required.', ex:'DoorDash, GoPuff, Favor, Uber' },
          { label:'Route', bg:'#e6f5ea', border:'#90c8a0', text:'#1a5c2a', desc:'Dedicated block or contract — assigned territory or schedule.', ex:'Amazon Flex, Better Trucks, OnTrac' },
          { label:'Fleet', bg:'#fef3e6', border:'#e8c080', text:'#7a4a0a', desc:'Integrated into dispatch system. Volume commitments apply.', ex:'Curri, Cargomatic, USPack, GoShare' },
          { label:'Other', bg:'#f0e8f8', border:'#c0a0e0', text:'#4a1a7a', desc:'Wraps, rentals, driveaway, mystery shopping.', ex:'Turo, Wrapify, Auto Driveaway' },
        ].map(fn => (
          <div key={fn.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 6 }}>
            <span style={{ flexShrink: 0, padding: '2px 8px', borderRadius: 20, fontSize: 8, fontWeight: 700, border: `1.5px solid ${fn.border}`, background: fn.bg, color: fn.text, whiteSpace: 'nowrap', marginTop: 1 }}>{fn.label}</span>
            <div style={{ fontSize: 9, color: '#666', lineHeight: 1.5 }}>{fn.desc} <span style={{ color: '#aaa', fontStyle: 'italic' }}>{fn.ex}</span></div>
          </div>
        ))}
      </div>

    </div>
  );
}
