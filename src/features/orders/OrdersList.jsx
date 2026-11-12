import React from 'react';
import OrderCard from '../../components/OrderCard';
import { PackageOpen } from 'lucide-react';

export default function OrdersList({ orders, onStatusChange }) {
  if (!orders || orders.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--border-light)'
      }}>
        <PackageOpen size={48} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
        <h3 style={{ color: 'var(--primary-navy)', marginBottom: '4px' }}>No Orders Found</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          No incoming orders match your filter criteria or have been placed yet.
        </p>
      </div>
    );
  }

  return (
    <div className="orders-grid">
      {orders.map(order => (
        <OrderCard 
          key={order.id} 
          order={order} 
          onStatusChange={onStatusChange} 
        />
      ))}
    </div>
  );
}
