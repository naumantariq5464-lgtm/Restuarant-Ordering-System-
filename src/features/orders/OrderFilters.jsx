import React from 'react';
import { Search } from 'lucide-react';

export default function OrderFilters({ search, setSearch, statusFilter, setStatusFilter }) {
  return (
    <div className="filters-bar">
      <div className="search-input-wrapper">
        <Search size={16} color="var(--text-muted)" />
        <input 
          type="text" 
          placeholder="Search by order #, customer name, email, or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Filter by Status:</span>
        <select 
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Orders</option>
          <option value="confirmed">Confirmed</option>
          <option value="cooking">Cooking</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>
  );
}
