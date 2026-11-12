import React from 'react';
import { RotateCw, Menu, Volume2 } from 'lucide-react';

export default function Header({ title, subtitle, onRefresh, isRefreshing, onToggleSidebar, onTestBell }) {
  return (
    <header className="top-header">
      <div className="header-left-group">
        <button 
          className="mobile-menu-btn" 
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={22} />
        </button>
        <div className="header-title-section">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="header-actions">
        <button 
          className="test-bell-btn" 
          onClick={onTestBell}
          title="Click to test notification bell tone"
        >
          <Volume2 size={15} />
          <span>Test Bell</span>
        </button>

        <button 
          className="refresh-btn" 
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh orders from n8n / Supabase"
        >
          <RotateCw size={15} className={isRefreshing ? 'spin' : ''} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
        </button>
      </div>
    </header>
  );
}
