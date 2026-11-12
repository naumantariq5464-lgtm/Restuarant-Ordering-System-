import React, { useState } from 'react';
import OrdersList from '../features/orders/OrdersList';
import OrderFilters from '../features/orders/OrderFilters';

export default function OrderHistoryPage({ orders, onStatusChange }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const historyOrders = orders.filter(o => o.status === 'delivered' || o.status === 'cancelled');

  const filteredHistory = historyOrders.filter(order => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return order.order_number?.toLowerCase().includes(q) ||
             order.customer?.full_name?.toLowerCase().includes(q) ||
             order.customer?.home_address?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <OrderFilters 
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />
      <OrdersList orders={filteredHistory} onStatusChange={onStatusChange} />
    </div>
  );
}
