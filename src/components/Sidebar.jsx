import React from 'react';
import { 
  UtensilsCrossed, 
  History,
  PlusCircle,
  X
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, ordersCount, isOpen, onClose, realtimeStatus = 'connecting' }) {
  const statusLabelMap = {
    connected: 'WebSocket Live',
    connecting: 'Connecting WS...',
    disconnected: 'WS Disconnected',
    unavailable: 'Manual Sync Only'
  };
  const statusLabel = statusLabelMap[realtimeStatus] || 'Connecting WS...';
  const navItems = [
    { id: 'orders', label: 'Live Orders', icon: UtensilsCrossed, badge: ordersCount },
    { id: 'history', label: 'Order History', icon: History },
    { id: 'menu', label: 'Add Menu', icon: PlusCircle }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={onClose} 
          aria-hidden="true" 
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-header-row">
            <div className="brand-title">
              <UtensilsCrossed size={22} color="#60A5FA" />
              <span>RestoBot Admin</span>
            </div>
            <button 
              className="sidebar-close-btn" 
              onClick={onClose}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
          <div className="brand-subtitle">Order Management System</div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onClose) onClose();
                }}
              >
                <Icon size={18} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span style={{
                    backgroundColor: isActive ? '#FFFFFF' : 'var(--accent-blue)',
                    color: isActive ? 'var(--primary-navy)' : '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}>
                    {item.badge}
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className={`connection-dot ${realtimeStatus}`} />
          <span>{statusLabel}</span>
        </div>
      </aside>
    </>
  );
}
