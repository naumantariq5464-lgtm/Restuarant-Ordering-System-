import React, { useState, useEffect, useRef, useCallback } from 'react';
import './styles/global.css';
import './styles/dashboard.css';
import './styles/cards.css';
import './styles/forms.css';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ConfirmDialog from './components/ConfirmDialog';
import OrdersPage from './pages/OrdersPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import MenuPage from './pages/MenuPage';

import { supabase } from './services/supabaseClient';
import { webhookService, formatSupabaseOrder } from './services/webhookService';
import { playOrderNotificationSound } from './utils/audioNotification';

export default function App() {
  const [activeTab, setActiveTab] = useState('orders'); // default to 'orders'
  const [orders, setOrders] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [menuRefreshKey, setMenuRefreshKey] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDialogLoading, setIsDialogLoading] = useState(false);
  const [newOrderToast, setNewOrderToast] = useState(null);
  const [realtimeStatus, setRealtimeStatus] = useState(supabase ? 'connecting' : 'unavailable');

  // Track known orders so the bell ALWAYS rings on new arrivals (and never twice for the same order)
  const knownOrderIdsRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);
  const toastTimerRef = useRef(null);

  // Dialog State
  const [dialogConfig, setDialogConfig] = useState({
    isOpen: false,
    order: null,
    targetStatus: null,
    title: '',
    message: '',
    variant: 'primary',
    confirmText: ''
  });

  const triggerNewOrderAlert = useCallback((order) => {
    playOrderNotificationSound();
    setNewOrderToast(`🔔 New Order Received: #${order.order_number || 'ORD'} (Rs ${order.total_amount})`);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setNewOrderToast(null), 6000);
  }, []);

  const upsertOrderInState = useCallback((incomingOrder) => {
    setOrders(prev => {
      const idx = prev.findIndex(o => String(o.id) === String(incomingOrder.id));
      let next;
      if (idx >= 0) {
        next = [...prev];
        next[idx] = { ...next[idx], ...incomingOrder };
      } else {
        next = [incomingOrder, ...prev];
      }
      return next.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    });
  }, []);

  // Load Data (called once on startup + when user manually clicks "Sync Data")
  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const ordersData = await webhookService.getOrders();
      const freshOrders = ordersData || [];

      if (isInitialLoadRef.current) {
        knownOrderIdsRef.current = new Set(freshOrders.map(o => String(o.id || o.order_number)));
        isInitialLoadRef.current = false;
        setOrders(freshOrders);
      } else {
        const newOrders = freshOrders.filter(
          o => !knownOrderIdsRef.current.has(String(o.id || o.order_number))
        );

        if (newOrders.length > 0) {
          triggerNewOrderAlert(newOrders[0]);
          freshOrders.forEach(o => knownOrderIdsRef.current.add(String(o.id || o.order_number)));
        }

        setOrders(freshOrders);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, [triggerNewOrderAlert]);

  // Initial load once + Real-time WebSocket subscription (0 polling!)
  useEffect(() => {
    loadData(false);

    if (!supabase) {
      setRealtimeStatus('unavailable');
      return;
    }

    const pendingTimers = new Set();
    const scheduleTimer = (fn, delayMs) => {
      const id = setTimeout(() => {
        pendingTimers.delete(id);
        fn();
      }, delayMs);
      pendingTimers.add(id);
    };

    const channel = supabase
      .channel('orders-realtime-dashboard')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newRow = payload.new;
          if (!newRow?.id) return;

          // Wait briefly so WF-02 finishes inserting customer/order_items, then fetch enriched order
          scheduleTimer(async () => {
            const enriched =
              (await webhookService.getOrderById(newRow.id)) ||
              formatSupabaseOrder(newRow);

            const orderKey = String(enriched.id || enriched.order_number);
            const isBrandNew = !knownOrderIdsRef.current.has(orderKey);
            knownOrderIdsRef.current.add(orderKey);
            isInitialLoadRef.current = false;

            upsertOrderInState(enriched);
            if (isBrandNew) {
              triggerNewOrderAlert(enriched);
            }

            // If order_items wasn't committed yet when fetched, do one quick re-fetch
            if (!enriched._hasRealItems) {
              scheduleTimer(async () => {
                const refreshed = await webhookService.getOrderById(newRow.id);
                if (refreshed) upsertOrderInState(refreshed);
              }, 1000);
            }
          }, 650);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        async (payload) => {
          const updatedRow = payload.new;
          if (!updatedRow?.id) return;

          setOrders(prev => {
            const exists = prev.some(o => String(o.id) === String(updatedRow.id));
            if (!exists) return prev;
            return prev.map(o =>
              String(o.id) === String(updatedRow.id)
                ? {
                    ...o,
                    status: updatedRow.status ?? o.status,
                    total_amount: updatedRow.total_amount !== undefined
                      ? parseFloat(updatedRow.total_amount)
                      : o.total_amount,
                    delivery_address: updatedRow.delivery_address ?? o.delivery_address
                  }
                : o
            );
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        (payload) => {
          const deletedId = payload.old?.id;
          if (!deletedId) return;
          setOrders(prev => prev.filter(o => String(o.id) !== String(deletedId)));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_items' },
        (payload) => {
          const orderId = payload.new?.order_id;
          if (!orderId) return;
          // Refresh items for that order silently without re-ringing the bell
          scheduleTimer(async () => {
            const refreshed = await webhookService.getOrderById(orderId);
            if (refreshed) upsertOrderInState(refreshed);
          }, 250);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setRealtimeStatus('disconnected');
        } else {
          setRealtimeStatus('connecting');
        }
      });

    return () => {
      pendingTimers.forEach(clearTimeout);
      pendingTimers.clear();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadData, triggerNewOrderAlert, upsertOrderInState]);

  // Handle 3 Status Buttons: cooking | delivered | cancelled
  const handleInitiateStatusChange = (order, targetStatus) => {
    if (targetStatus === 'cancelled') {
      setDialogConfig({
        isOpen: true,
        order,
        targetStatus,
        title: 'Cancel Order?',
        message: `Order #${order.order_number} cancel karna chahte hain? Bot customer ko kahega: "Due to emergency aapka order cancel kar diya gaya hai".`,
        variant: 'danger',
        confirmText: 'Yes, Cancel'
      });
    } else if (targetStatus === 'cooking') {
      setDialogConfig({
        isOpen: true,
        order,
        targetStatus,
        title: 'Mark as Cooking',
        message: `Order #${order.order_number} ka status Cooking karein? Customer Telegram par check karega toh cooking state dikhayega.`,
        variant: 'primary',
        confirmText: 'Mark Cooking'
      });
    } else if (targetStatus === 'delivered') {
      setDialogConfig({
        isOpen: true,
        order,
        targetStatus,
        title: 'Mark as Delivered',
        message: `Order #${order.order_number} ko Delivered mark karein?`,
        variant: 'primary',
        confirmText: 'Confirm Delivered'
      });
    }
  };

  const handleConfirmStatusChange = async () => {
    const { order, targetStatus } = dialogConfig;
    if (!order || !targetStatus || isDialogLoading) return;

    setIsDialogLoading(true);
    try {
      await webhookService.updateOrderStatus(order.id, targetStatus);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: targetStatus } : o));
      setDialogConfig({ isOpen: false, order: null, targetStatus: null });
    } finally {
      setIsDialogLoading(false);
    }
  };

  const handleCancelDialog = () => {
    setDialogConfig({ isOpen: false, order: null, targetStatus: null });
  };

  // Header Title
  const getHeaderInfo = () => {
    if (activeTab === 'orders') {
      return {
        title: 'Live Orders',
        subtitle: 'Incoming restaurant orders. Change status using Cooking, Delivered, or Cancel buttons.'
      };
    }
    if (activeTab === 'menu') {
      return {
        title: 'Add Menu',
        subtitle: 'Add new menu items or edit and delete existing dishes in Supabase.'
      };
    }
    return {
      title: 'Order History',
      subtitle: 'Delivered and Cancelled completed order records.'
    };
  };

  const { title, subtitle } = getHeaderInfo();
  const liveOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'cooking');

  return (
    <div className="admin-layout">
      {/* Real-time Order Alert Toast */}
      {newOrderToast && (
        <div className="new-order-toast">
          <span>{newOrderToast}</span>
        </div>
      )}

      {/* Sidebar with only 2 tabs: Live Orders & Order History */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ordersCount={liveOrders.length}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        realtimeStatus={realtimeStatus}
      />

      {/* Main Wrapper */}
      <div className="main-wrapper">
        <Header
          title={title}
          subtitle={subtitle}
          onRefresh={() => {
            loadData(true);
            setMenuRefreshKey((prev) => prev + 1);
          }}
          isRefreshing={isRefreshing}
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          onTestBell={playOrderNotificationSound}
        />

        <main className="content-body">
          {activeTab === 'orders' && (
            <OrdersPage
              orders={liveOrders}
              onStatusChange={handleInitiateStatusChange}
            />
          )}

          {activeTab === 'history' && (
            <OrderHistoryPage
              orders={orders}
              onStatusChange={handleInitiateStatusChange}
            />
          )}

          {activeTab === 'menu' && (
            <MenuPage refreshTrigger={menuRefreshKey} />
          )}
        </main>
      </div>

      {/* Confirmation Modal */}
      <ConfirmDialog
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        message={dialogConfig.message}
        variant={dialogConfig.variant}
        confirmText={dialogConfig.confirmText}
        isLoading={isDialogLoading}
        onConfirm={handleConfirmStatusChange}
        onCancel={handleCancelDialog}
      />
    </div>
  );
}
