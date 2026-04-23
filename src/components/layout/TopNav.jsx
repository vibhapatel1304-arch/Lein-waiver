import React from "react";
import { Search, Bell } from "lucide-react";

function TopNav({ title }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        height: '60px',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e5e7eb',
        background: '#ffffff',
        padding: '0 2rem',
      }}
    >
      {/* Left — Page title */}
      <h1
        style={{
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: '#111827',
          margin: 0,
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h1>

      {/* Right — search, notifications, avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search..."
            style={{
              height: '36px',
              width: '220px',
              borderRadius: '9999px',
              background: '#f3f4f6',
              border: '1px solid transparent',
              paddingLeft: '2.25rem',
              paddingRight: '1rem',
              fontSize: '0.8125rem',
              color: '#374151',
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#f07030';
              e.target.style.boxShadow = '0 0 0 3px rgba(240,112,48,0.12)';
              e.target.style.background = '#fff';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'transparent';
              e.target.style.boxShadow = 'none';
              e.target.style.background = '#f3f4f6';
            }}
          />
        </div>

        {/* Notification bell */}
        <button
          type="button"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1px solid #e5e7eb',
            background: '#fff',
            color: '#6b7280',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
        >
          <Bell size={16} />
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#f07030',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: 700,
              color: '#fff',
              border: '2px solid #fff',
            }}
          >
            3
          </span>
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />

        {/* User avatar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#f07030',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#fff',
              userSelect: 'none',
            }}
          >
            MT
          </div>
          <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151' }}>
            Mike T.
          </span>
        </div>
      </div>
    </header>
  );
}

export default TopNav;
