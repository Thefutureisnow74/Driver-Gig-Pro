import React, { useState, useRef, useEffect } from 'react';
import { C } from './theme';

export default function HandlerCombobox({ value, handlers, onChange, onHandlersChange }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = handlers.filter(h => h.toLowerCase().includes(filter.toLowerCase()));

  function select(name) {
    onChange(name);
    setFilter('');
    setOpen(false);
  }

  function addNew() {
    const name = filter.trim() || prompt('Enter new handler name:');
    if (!name) return;
    if (!handlers.includes(name)) {
      const updated = [...handlers, name];
      onHandlersChange(updated);
    }
    select(name);
  }

  function rename(oldName) {
    const newName = prompt(`Rename "${oldName}" to:`, oldName);
    if (!newName || newName === oldName) return;
    const updated = handlers.map(h => h === oldName ? newName : h);
    onHandlersChange(updated);
    if (value === oldName) onChange(newName);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={open ? filter : value}
          onChange={e => { setFilter(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setFilter(''); }}
          placeholder="Select handler..."
          style={{ width: '100%', padding: '6px 24px 6px 8px', border: `1.5px solid ${open ? C.navy : '#ddd'}`, borderRadius: 7, fontSize: 12, fontFamily: 'inherit', background: '#fff', color: '#111', outline: 'none', boxSizing: 'border-box' }}
        />
        <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#aaa', pointerEvents: 'none' }}>▼</span>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0, background: '#fff', border: `1.5px solid ${C.navy}`, borderRadius: 7, zIndex: 500, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,.12)' }}>
          {filtered.map(h => (
            <HandlerOption key={h} name={h} selected={h === value} onSelect={() => select(h)} onRename={() => rename(h)} />
          ))}
          <div
            onClick={addNew}
            style={{ padding: '7px 9px', fontSize: 12, color: '#2c4a8f', fontWeight: 700, cursor: 'pointer', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 5 }}
            onMouseEnter={e => e.currentTarget.style.background = '#eef2ff'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            + Add New Handler
          </div>
        </div>
      )}
    </div>
  );
}

function HandlerOption({ name, selected, onSelect, onRename }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ padding: '7px 9px', fontSize: 12, cursor: 'pointer', color: selected ? '#1a3a8b' : '#111', background: selected ? '#e8f0fd' : hover ? '#eef2ff' : 'transparent', fontWeight: selected ? 700 : 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}
    >
      <span>{name}</span>
      {hover && (
        <span
          onClick={e => { e.stopPropagation(); onRename(); }}
          style={{ fontSize: 10, color: '#1e2d5a', border: '1px solid #a0b8f0', background: '#e8f0fd', borderRadius: 4, padding: '1px 5px', cursor: 'pointer' }}
        >
          ✏ Rename
        </span>
      )}
    </div>
  );
}
