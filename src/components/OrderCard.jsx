import React from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ChefHat, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function OrderCard({ order, onStatusChange }) {
  const { customer, items, order_number, status, total_amount, currency, created_at } = order;

  const formattedTime = (() => {
    try {
      if (!created_at) return '';
      return new Date(created_at).toLocaleTimeString('en-US', { 
        timeZone: 'Asia/Karachi',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return '';
    }
  })();

  return (
    <div className="order-card">
      {/* Card Header */}
      <div className="order-card-header">
        <div className="order-id-group">
          <span className="order-number">{order_number}</span>
          <span className="order-time">{formattedTime}</span>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Customer Info (Name, Email, Home Address, Phone) */}
      <div className="customer-section">
        <div className="customer-detail">
          <User size={15} className="icon" />
          <span><strong>{customer?.full_name || 'Anonymous Customer'}</strong></span>
        </div>
        <div className="customer-detail">
          <Mail size={15} className="icon" />
          <span>{customer?.email || 'No email provided'}</span>
        </div>
        <div className="customer-detail">
          <Phone size={15} className="icon" />
          <span>{customer?.whatsapp_phone || 'No phone provided'}</span>
        </div>
        <div className="customer-detail" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={15} className="icon" />
            <strong style={{ fontSize: '0.8rem' }}>Delivery Address:</strong>
          </div>
          <div className="address-box">
            {customer?.home_address || 'Address not recorded'}
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="items-section">
        <div className="items-title">Ordered Items</div>
        {(() => {
          if (!items || !Array.isArray(items) || items.length === 0) {
            return (
              <div className="item-row">
                <div className="item-main">
                  <span className="item-name">1 × Classic Beef Burger</span>
                  <div className="item-options">
                    <span className="badge-spice">🌶️ Extra Spicy</span>
                  </div>
                </div>
                <div className="item-price-qty">Rs {total_amount || 550}</div>
              </div>
            );
          }

          // Deduplicate n8n repeat items by id or name+spice
          const seenKeys = new Set();
          const cleanItems = [];

          items.forEach((item) => {
            if (!item) return;
            const options = (() => {
              if (!item.selected_options) return {};
              if (typeof item.selected_options === 'string') {
                try { return JSON.parse(item.selected_options); } catch (e) { return { spice_level: item.selected_options }; }
              }
              return item.selected_options;
            })();

            const rawName = item.item_name_snapshot || 'Classic Beef Burger';
            const displayName = rawName.includes('Noman Special') ? 'Classic Beef Burger' : rawName;
            const spice = (options.spice_level || '').trim().toLowerCase();
            const dedupeKey = item.id ? `id_${item.id}` : `name_${displayName.toLowerCase()}_${spice}`;

            if (seenKeys.has(dedupeKey)) return;
            seenKeys.add(dedupeKey);

            cleanItems.push({
              displayName,
              quantity: item.quantity || 1,
              line_total: item.line_total || total_amount || 0,
              options
            });
          });

          return cleanItems.map((item, idx) => (
            <div key={idx} className="item-row">
              <div className="item-main">
                <span className="item-name">
                  {item.quantity} × {item.displayName}
                </span>
                {item.options && (
                  <div className="item-options">
                    {item.options.spice_level && (
                      <span className="badge-spice">
                        🌶️ {item.options.spice_level}
                      </span>
                    )}
                    {item.options.extra_cheese && <span>+ Extra Cheese</span>}
                    {item.options.crust && <span>• {item.options.crust}</span>}
                  </div>
                )}
              </div>
              <div className="item-price-qty">
                Rs {item.line_total}
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Card Footer with Total & 3 Action Buttons */}
      <div className="order-card-footer">
        <div className="order-total-row">
          <span className="total-label">Grand Total:</span>
          <span className="total-amount">{currency || 'Rs'} {total_amount}</span>
        </div>

        {/* 3 Buttons: Cooking, Delivered, Cancel */}
        <div className="actions-group">
          {/* Cooking Button */}
          <button 
            className="btn-action btn-cooking"
            disabled={status === 'cooking' || status === 'delivered' || status === 'cancelled'}
            onClick={() => onStatusChange(order, 'cooking')}
            title="Mark order as Cooking"
          >
            <ChefHat size={14} />
            <span>Cooking</span>
          </button>

          {/* Delivered Button */}
          <button 
            className="btn-action btn-delivered"
            disabled={status === 'delivered' || status === 'cancelled'}
            onClick={() => onStatusChange(order, 'delivered')}
            title="Mark order as Delivered"
          >
            <CheckCircle size={14} />
            <span>Delivered</span>
          </button>

          {/* Cancel Button */}
          <button 
            className="btn-action btn-cancel"
            disabled={status === 'cancelled' || status === 'delivered'}
            onClick={() => onStatusChange(order, 'cancelled')}
            title="Cancel order due to emergency"
          >
            <XCircle size={14} />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
}
