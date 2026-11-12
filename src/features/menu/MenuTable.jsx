import React, { useState } from 'react';
import { Plus, Edit2, Check, X } from 'lucide-react';

export default function MenuTable({ menu, onToggleAvailability, onUpdatePrice }) {
  const [editingId, setEditingId] = useState(null);
  const [newPrice, setNewPrice] = useState('');

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setNewPrice(item.price);
  };

  const handleSavePrice = (id) => {
    if (newPrice) {
      onUpdatePrice(id, newPrice);
    }
    setEditingId(null);
  };

  return (
    <div className="menu-table-container">
      <div style={{
        padding: '18px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-light)'
      }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
            Restaurant Menu Items
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Manage food availability and real-time pricing synced with Telegram Bot & Supabase
          </p>
        </div>
      </div>

      <table className="menu-table">
        <thead>
          <tr>
            <th>Item Name</th>
            <th>Category</th>
            <th>Description</th>
            <th>Price (PKR)</th>
            <th>Availability</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {menu.map(item => (
            <tr key={item.id}>
              <td><strong>{item.name}</strong></td>
              <td>
                <span style={{
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)'
                }}>
                  {item.category}
                </span>
              </td>
              <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                {item.description}
              </td>
              <td>
                {editingId === item.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input 
                      type="number" 
                      value={newPrice} 
                      onChange={e => setNewPrice(e.target.value)}
                      style={{ width: '80px', padding: '4px 8px' }}
                      autoFocus
                    />
                    <button onClick={() => handleSavePrice(item.id)} style={{ color: 'var(--status-delivered)' }}>
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingId(null)} style={{ color: 'var(--status-cancelled)' }}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <strong>Rs {item.price}</strong>
                )}
              </td>
              <td>
                <label className="switch-toggle">
                  <input 
                    type="checkbox" 
                    checked={item.is_available} 
                    onChange={() => onToggleAvailability(item.id)}
                  />
                  <span className="slider"></span>
                </label>
                <span style={{ 
                  marginLeft: '8px', 
                  fontSize: '0.75rem', 
                  color: item.is_available ? 'var(--status-delivered)' : 'var(--text-muted)' 
                }}>
                  {item.is_available ? 'Available' : 'Sold Out'}
                </span>
              </td>
              <td>
                <button 
                  onClick={() => handleStartEdit(item)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-blue)' }}
                >
                  <Edit2 size={13} />
                  <span>Edit Price</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
