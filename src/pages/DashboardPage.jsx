import React from 'react';
import { 
  ShoppingBag, 
  ChefHat, 
  CheckCircle2, 
  TrendingUp, 
  XCircle 
} from 'lucide-react';
import StatCard from '../components/StatCard';
import OrdersList from '../features/orders/OrdersList';

export default function DashboardPage({ orders, onStatusChange }) {
  const confirmedCount = orders.filter(o => o.status === 'confirmed').length;
  const cookingCount = orders.filter(o => o.status === 'cooking').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length;
  
  const totalSales = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const activeOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'cooking');

  return (
    <>
      {/* 4 Stats Cards */}
      <div className="stats-grid">
        <StatCard 
          title="New Confirmed" 
          value={confirmedCount} 
          icon={ShoppingBag}
          color="#0284C7"
          bgColor="#E0F2FE"
        />
        <StatCard 
          title="Currently Cooking" 
          value={cookingCount} 
          icon={ChefHat}
          color="#D97706"
          bgColor="#FEF3C7"
        />
        <StatCard 
          title="Completed & Delivered" 
          value={deliveredCount} 
          icon={CheckCircle2}
          color="#16A34A"
          bgColor="#DCFCE7"
        />
        <StatCard 
          title="Total Revenue (Delivered)" 
          value={`Rs ${totalSales.toLocaleString()}`} 
          icon={TrendingUp}
          color="#2563EB"
          bgColor="#DBEAFE"
        />
      </div>

      {/* Active Orders Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
              Active Kitchen & Incoming Orders
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Orders currently pending cooking or on the way to the customer
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-blue)' }}>
            {activeOrders.length} In Progress
          </span>
        </div>

        <OrdersList orders={activeOrders} onStatusChange={onStatusChange} />
      </div>
    </>
  );
}
