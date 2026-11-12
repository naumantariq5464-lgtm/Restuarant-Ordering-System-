import React, { useState } from 'react';
import OrderFilters from '../features/orders/OrderFilters';
import OrdersList from '../features/orders/OrdersList';

export default function OrdersPage({ orders, onStatusChange }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredOrders = orders.filter(order => {
    // Status Filter
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }

    // Search Query (order_number, name, email, address)
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNumber = order.order_number?.toLowerCase().includes(q);
      const matchName = order.customer?.full_name?.toLowerCase().includes(q);
      const matchEmail = order.customer?.email?.toLowerCase().includes(q);
      const matchAddress = order.customer?.home_address?.toLowerCase().includes(q);
      return matchNumber || matchName || matchEmail || matchAddress;
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

      <OrdersList 
        orders={filteredOrders} 
        onStatusChange={onStatusChange} 
      />
    </div>
  );
}
