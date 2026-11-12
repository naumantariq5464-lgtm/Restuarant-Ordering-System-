import { INITIAL_ORDERS, INITIAL_MENU } from './mockData';
import { supabase } from './supabaseClient';

// Configurable n8n Production Webhook endpoint from .env
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://your-n8n-instance.com/webhook/admin';

function parseSelectedOptions(rawOptions) {
  let options = rawOptions;
  if (typeof options === 'string') {
    try {
      options = JSON.parse(options);
    } catch {
      options = { spice_level: options };
    }
  }
  if (!options || typeof options !== 'object') {
    return { spice_level: 'Medium' };
  }
  return {
    ...options,
    spice_level: options.spice_level || 'Medium',
  };
}

function formatOrderItems(rawItems = []) {
  const seenKeys = new Set();
  const formatted = [];

  for (const item of rawItems) {
    if (!item) continue;
    const uniqueKey = item.id
      ? String(item.id)
      : `${item.order_id}_${item.item_name_snapshot}_${item.quantity}`;
    if (seenKeys.has(uniqueKey)) continue;
    seenKeys.add(uniqueKey);

    const options = parseSelectedOptions(item.selected_options);
    const rawName = item.item_name_snapshot || 'Classic Beef Burger';
    const itemName = rawName.includes('Noman Special') ? 'Classic Beef Burger' : rawName;
    const qty = parseInt(item.quantity, 10) || 1;
    const lineTotal = parseFloat(item.line_total) || 0;

    const existing = formatted.find(
      (i) =>
        i.item_name_snapshot.toLowerCase().trim() === itemName.toLowerCase().trim() &&
        (i.selected_options?.spice_level || '').toLowerCase().trim() ===
          (options.spice_level || '').toLowerCase().trim()
    );

    if (existing) {
      existing.quantity += qty;
      existing.line_total += lineTotal;
    } else {
      formatted.push({
        id: item.id,
        item_name_snapshot: itemName,
        quantity: qty,
        unit_price_snapshot: parseFloat(item.unit_price_snapshot) || 0,
        line_total: lineTotal,
        selected_options: options,
      });
    }
  }

  return formatted;
}

export function formatSupabaseOrder(order, customer = {}, rawItems = []) {
  const formattedItems = formatOrderItems(rawItems);
  const fallbackItems = [
    {
      item_name_snapshot: 'Classic Beef Burger',
      quantity: 1,
      line_total: parseFloat(order.total_amount) || 0,
      selected_options: { spice_level: 'Extra Spicy' },
    },
  ];

  const resolvedAddress =
    order.delivery_address || customer?.home_address || 'Address on record';

  return {
    id: order.id,
    order_number: order.order_number || `ORD-${order.id}`,
    status: order.status || 'confirmed',
    total_amount: parseFloat(order.total_amount) || 0,
    currency: order.currency || 'PKR',
    created_at: order.created_at || new Date().toISOString(),
    delivery_address: resolvedAddress,
    customer: {
      id: customer?.id || order.customer_id,
      full_name: customer?.full_name || 'Customer',
      email: customer?.email || 'customer@gmail.com',
      whatsapp_phone: customer?.whatsapp_phone || '0300-0000000',
      home_address: resolvedAddress,
    },
    items: formattedItems.length > 0 ? formattedItems : fallbackItems,
    _hasRealItems: formattedItems.length > 0,
  };
}

class WebhookService {
  constructor() {
    this.webhookUrl = N8N_WEBHOOK_URL;
    this.localOrders = [...INITIAL_ORDERS];
    this.localMenu = [...INITIAL_MENU];
  }

  isN8nConfigured() {
    return Boolean(this.webhookUrl) && !this.webhookUrl.includes('your-n8n-instance.com');
  }

  // Fetch all orders directly from Supabase (0 n8n executions)
  async getOrdersFromSupabase() {
    if (!supabase) return null;

    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersErr || !Array.isArray(orders)) {
      throw new Error(ordersErr?.message || 'Supabase orders query failed');
    }

    if (orders.length === 0) return [];

    const customerIds = [...new Set(orders.map((o) => o.customer_id).filter(Boolean))];
    const orderIds = orders.map((o) => o.id).filter(Boolean);

    const [{ data: customers }, { data: orderItems }] = await Promise.all([
      customerIds.length > 0
        ? supabase.from('customers').select('*').in('id', customerIds)
        : Promise.resolve({ data: [] }),
      orderIds.length > 0
        ? supabase.from('order_items').select('*').in('order_id', orderIds)
        : Promise.resolve({ data: [] }),
    ]);

    const customerMap = {};
    (customers || []).forEach((c) => {
      if (c.id) customerMap[c.id] = c;
    });

    const itemsByOrderId = {};
    (orderItems || []).forEach((item) => {
      if (!item?.order_id) return;
      if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
      itemsByOrderId[item.order_id].push(item);
    });

    return orders.map((order) =>
      formatSupabaseOrder(order, customerMap[order.customer_id] || {}, itemsByOrderId[order.id] || [])
    );
  }

  // Fetch a single enriched order by ID (used when a WebSocket INSERT/UPDATE event arrives)
  async getOrderById(orderId) {
    if (supabase && orderId) {
      try {
        const { data: order, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (!error && order) {
          const [{ data: customer }, { data: items }] = await Promise.all([
            order.customer_id
              ? supabase.from('customers').select('*').eq('id', order.customer_id).maybeSingle()
              : Promise.resolve({ data: null }),
            supabase.from('order_items').select('*').eq('order_id', order.id),
          ]);

          return formatSupabaseOrder(order, customer || {}, items || []);
        }
      } catch (err) {
        console.warn('Direct Supabase single-order fetch failed, trying n8n fallback:', err.message);
      }
    }

    // Fallback: fetch once from n8n webhook if Supabase direct SELECT is blocked by RLS
    const orders = await this.getOrders();
    return orders.find((o) => String(o.id) === String(orderId)) || null;
  }

  // Fetch all orders (Supabase first, n8n webhook fallback, then mock fallback)
  async getOrders() {
    try {
      const supaOrders = await this.getOrdersFromSupabase();
      if (Array.isArray(supaOrders)) {
        this.localOrders = supaOrders;
        return supaOrders;
      }
    } catch (err) {
      console.warn('Supabase direct read unavailable, falling back to n8n webhook:', err.message);
    }

    try {
      if (this.isN8nConfigured()) {
        const res = await fetch(`${this.webhookUrl}/orders`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          const orders = Array.isArray(data) ? data : data.orders || [];
          if (Array.isArray(orders)) {
            this.localOrders = orders;
            return orders;
          }
        }
      }
    } catch (err) {
      console.warn('n8n Webhook unreachable, using local storage state:', err.message);
    }

    return this.localOrders;
  }

  // Update order status (cooking | delivered | cancelled)
  async updateOrderStatus(orderId, newStatus) {
    // Primary: Update directly in Supabase (0 n8n executions, no CORS preflight issues)
    if (supabase) {
      try {
        const { error } = await supabase
          .from('orders')
          .update({ status: newStatus })
          .eq('id', orderId);

        if (!error) {
          // Best-effort audit log in order_events
          await supabase.from('order_events').insert({
            order_id: orderId,
            new_status: newStatus,
            changed_by: 'admin',
          });
          return { success: true, orderId, status: newStatus };
        }
        console.warn('Supabase direct status update blocked, falling back to n8n webhook:', error.message);
      } catch (err) {
        console.warn('Supabase status update failed, falling back to n8n webhook:', err.message);
      }
    }

    // Fallback: call n8n WF-03 webhook
    try {
      if (this.isN8nConfigured()) {
        const res = await fetch(`${this.webhookUrl}/orders/${orderId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: orderId,
            status: newStatus,
            timestamp: new Date().toISOString(),
          }),
        });
        if (res.ok) {
          return await res.json();
        }
      }
    } catch (err) {
      console.warn('n8n Webhook unreachable for status update, applying locally:', err.message);
    }

    // Fallback: update in-memory
    this.localOrders = this.localOrders.map((order) => {
      if (order.id === orderId) {
        return { ...order, status: newStatus, updated_at: new Date().toISOString() };
      }
      return order;
    });

    return { success: true, orderId, status: newStatus };
  }

  // Get Menu Items (Supabase primary, n8n fallback, then local fallback)
  async getMenu() {
    if (supabase) {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw new Error(error.message || 'Failed to load menu items from Supabase');
      }
      if (Array.isArray(data)) {
        this.localMenu = data;
        return data;
      }
    }

    try {
      if (this.isN8nConfigured()) {
        const res = await fetch(`${this.webhookUrl}/menu`);
        if (res.ok) return await res.json();
      }
    } catch (err) {
      console.warn('n8n Webhook unreachable for menu, using local:', err.message);
    }
    return this.localMenu;
  }

  // Add a new menu item in Supabase
  async addMenuItem({ name, price, description = '', is_available = true }) {
    if (!supabase) {
      throw new Error('Supabase client is not configured');
    }

    const payload = {
      name: String(name || '').trim(),
      price: parseFloat(price),
      description: String(description || '').trim() || null,
      is_available: Boolean(is_available),
    };

    const { data, error } = await supabase
      .from('menu_items')
      .insert([payload])
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to add menu item');
    }
    return data;
  }

  // Update an existing menu item in Supabase
  async updateMenuItem(itemId, { name, price, description = '', is_available = true }) {
    if (!supabase) {
      throw new Error('Supabase client is not configured');
    }

    const payload = {
      name: String(name || '').trim(),
      price: parseFloat(price),
      description: String(description || '').trim() || null,
      is_available: Boolean(is_available),
    };

    const { data, error } = await supabase
      .from('menu_items')
      .update(payload)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to update menu item');
    }
    return data;
  }

  // Delete a menu item from Supabase
  async deleteMenuItem(itemId) {
    if (!supabase) {
      throw new Error('Supabase client is not configured');
    }

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      throw new Error(error.message || 'Failed to delete menu item');
    }
    return true;
  }

  // Toggle item availability
  async toggleAvailability(itemId, currentAvailability) {
    if (!supabase) {
      throw new Error('Supabase client is not configured');
    }

    const { data, error } = await supabase
      .from('menu_items')
      .update({ is_available: !currentAvailability })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to update availability');
    }
    return data;
  }
}

export const webhookService = new WebhookService();
