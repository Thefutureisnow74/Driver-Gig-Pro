import React from 'react';
import { C, STATUS_COLORS, PRIORITY_COLORS } from './theme';

export function StatusBadge({ status }) {
  const col = STATUS_COLORS[status] || STATUS_COLORS.Researching;
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const col = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Medium;
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>
      {priority}
    </span>
  );
}

export function StatusPill({ status }) {
  const MAP = {
    Researching: { bg:'#e3f2fd', border:'#90caf9', text:'#1565c0' },
    Applied:     { bg:'#fff8e1', border:'#ffe082', text:'#6d4c00' },
    Waiting:     { bg:'#fde8e4', border:'#e8a898', text:'#8b2a1a' },
    Offered:     { bg:'#c8e6c9', border:'#81c784', text:'#1b5e20' },
    Active:      { bg:'#c8e6c9', border:'#81c784', text:'#1b5e20' },
    Overdue:     { bg:'#fde4e4', border:'#d97070', text:'#7a1111' },
  };
  const col = MAP[status] || MAP.Researching;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: col.bg, color: col.text, border: `1.5px solid ${col.border}` }}>
      {status}
    </span>
  );
}

export function PriorityPill({ priority }) {
  const MAP = {
    High:   { bg:'#fce4ee', border:'#e8a0bc', text:'#7d1a40' },
    Medium: { bg:'#fff8e1', border:'#ffe082', text:'#6d4c00' },
    Low:    { bg:'#e8f5e9', border:'#a5d6a7', text:'#1b5e20' },
  };
  const col = MAP[priority] || MAP.Medium;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: col.bg, color: col.text, border: `1.5px solid ${col.border}` }}>
      {priority}
    </span>
  );
}

export function TanPill({ children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: '#f5f0e6', color: '#3d3526', border: '1.5px solid #c8bfa8' }}>
      {children}
    </span>
  );
}

export function Chip({ label, active, onToggle, activeStyle }) {
  const on = activeStyle || { background: C.chipBlue.bg, border: `1.5px solid ${C.chipBlue.border}`, color: C.chipBlue.text };
  const off = { background: C.chipOff.bg, border: `1.5px solid ${C.chipOff.border}`, color: C.chipOff.text };
  return (
    <span
      onClick={() => onToggle && onToggle(label)}
      style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: onToggle ? 'pointer' : 'default', userSelect: 'none', transition: 'all .12s', ...(active ? on : off) }}
    >
      {label}
    </span>
  );
}

export function GreenChip({ label, active, onToggle }) {
  return (
    <Chip
      label={label}
      active={active}
      onToggle={onToggle}
      activeStyle={{ background: C.chipGreen.bg, border: `1.5px solid ${C.chipGreen.border}`, color: C.chipGreen.text }}
    />
  );
}

export function BtnPrimary({ children, onClick, style = {} }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ padding: '9px 20px', background: hover ? '#2e4080' : C.navy, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'background .15s', ...style }}
    >
      {children}
    </button>
  );
}

export function BtnSecondary({ children, onClick, style = {} }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ padding: '8px 16px', background: '#fff', color: hover ? C.navy : '#555', border: `1.5px solid ${hover ? C.navy : '#ddd'}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', ...style }}
    >
      {children}
    </button>
  );
}

export function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#888', marginBottom: 8 }}>
      {children}
    </div>
  );
}

export function Divider({ margin = '10px 0' }) {
  return <div style={{ height: 1, background: '#ede8e0', margin }} />;
}

export function Card({ children, style = {} }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2ddd6', borderRadius: 12, ...style }}>
      {children}
    </div>
  );
}
