import React from 'react';

export default function StatCard({ title, value, icon: Icon, color, bgColor }) {
  return (
    <div className="stat-card">
      <div className="stat-info">
        <h3>{title}</h3>
        <div className="stat-value">{value}</div>
      </div>
      <div className="stat-icon-wrapper" style={{ backgroundColor: bgColor }}>
        <Icon size={24} color={color} />
      </div>
    </div>
  );
}
