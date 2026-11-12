import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PlusCircle, Pencil, Trash2, Search, Check, X, Loader2 } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { webhookService } from '../services/webhookService';

const EMPTY_FORM = {
  name: '',
  price: '',
  description: '',
};

export default function MenuPage({ refreshTrigger = 0 }) {
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingItem, setEditingItem] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text: string }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formRef = useRef(null);
  const feedbackTimerRef = useRef(null);

  const showFeedback = useCallback((type, text) => {
    setFeedback({ type, text });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
    }, 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const loadMenu = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await webhookService.getMenu();
      setMenuItems(Array.isArray(items) ? items : []);
    } catch (err) {
      showFeedback('error', `Menu load error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [showFeedback]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu, refreshTrigger]);

  const handleResetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    const trimmedName = formData.name.trim();
    const numericPrice = parseFloat(formData.price);

    if (!trimmedName) {
      showFeedback('error', 'Menu item name likhna zaroori hai.');
      return;
    }
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      showFeedback('error', 'Valid price (Rs > 0) likhein.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        const updated = await webhookService.updateMenuItem(editingItem.id, {
          name: trimmedName,
          price: numericPrice,
          description: formData.description,
          is_available: editingItem.is_available !== false,
        });
        setMenuItems((prev) =>
          prev.map((item) => (item.id === editingItem.id ? updated : item))
        );
        showFeedback('success', `"${updated.name}" successfully update ho gaya!`);
        handleResetForm();
      } else {
        const created = await webhookService.addMenuItem({
          name: trimmedName,
          price: numericPrice,
          description: formData.description,
          is_available: true,
        });
        setMenuItems((prev) => [created, ...prev]);
        showFeedback('success', `"${created.name}" database mein add ho gaya!`);
        handleResetForm();
      }
    } catch (err) {
      showFeedback('error', `Database error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (item) => {
    setFeedback(null);
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      price: item.price !== undefined && item.price !== null ? String(item.price) : '',
      description: item.description || '',
    });
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    const target = deleteTarget;
    setFeedback(null);
    setIsDeleting(true);

    try {
      await webhookService.deleteMenuItem(target.id);
      setMenuItems((prev) => prev.filter((item) => item.id !== target.id));
      if (editingItem && editingItem.id === target.id) {
        handleResetForm();
      }
      setDeleteTarget(null);
      showFeedback('success', `"${target.name}" database se delete ho gaya!`);
    } catch (err) {
      setDeleteTarget(null);
      showFeedback('error', `Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredItems = menuItems.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (item.name || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="menu-page-layout">
      {/* Add / Edit Menu Form */}
      <section className="menu-form-card" ref={formRef}>
        <div className="menu-form-header">
          <h2>
            {editingItem ? <Pencil size={18} color="#2563EB" /> : <PlusCircle size={18} color="#142B4A" />}
            <span>{editingItem ? `Edit Menu Item: ${editingItem.name}` : 'Add New Menu Item'}</span>
          </h2>
          {editingItem && (
            <button type="button" className="btn-secondary" onClick={handleResetForm}>
              <X size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Cancel Edit
            </button>
          )}
        </div>

        {feedback && (
          <div className={`menu-feedback-banner ${feedback.type}`}>
            {feedback.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="menu-form-grid">
            <div className="form-group">
              <label htmlFor="menu-name">Item Name *</label>
              <input
                id="menu-name"
                type="text"
                className="form-input"
                placeholder="e.g. Zinger Burger"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="menu-price">Price (Rs) *</label>
              <input
                id="menu-price"
                type="number"
                min="1"
                step="0.01"
                className="form-input"
                placeholder="e.g. 450"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="menu-desc">Description (Optional)</label>
              <input
                id="menu-desc"
                type="text"
                className="form-input"
                placeholder="e.g. Crispy fried chicken fillet with sauce"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          <div className="menu-form-footer" style={{ justifyContent: 'flex-end' }}>
            <div className="menu-form-actions">
              <button type="submit" className="btn-primary-action" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 size={16} className="spin" />
                ) : editingItem ? (
                  <Check size={16} />
                ) : (
                  <PlusCircle size={16} />
                )}
                <span>
                  {isSaving
                    ? 'Saving...'
                    : editingItem
                    ? 'Update Menu Item'
                    : 'Add Menu Item'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Saved Menu Items List */}
      <section className="menu-table-container">
        <div className="menu-list-header">
          <div className="search-input-wrapper" style={{ maxWidth: 360 }}>
            <Search size={16} color="#64748B" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="menu-count-pill">
            Total Items: {filteredItems.length}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="menu-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item Name</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '28px', color: '#64748B' }}>
                    Loading menu items from database...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '28px', color: '#64748B' }}>
                    {menuItems.length === 0
                      ? 'Database se koi menu item nahi mila. Agar Supabase mein items save hain toh Supabase SQL Editor mein menu_items RLS policy run karein, ya upar form se naya item add karein!'
                      : 'Search se koi menu item match nahi hua.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      {item.description && (
                        <div className="menu-item-desc">{item.description}</div>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>Rs {item.price}</td>
                    <td>
                      <div className="menu-actions-cell">
                        <button
                          type="button"
                          className="icon-btn edit"
                          title="Edit menu item"
                          aria-label={`Edit ${item.name}`}
                          onClick={() => handleStartEdit(item)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn delete"
                          title="Delete menu item"
                          aria-label={`Delete ${item.name}`}
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Menu Item?"
        message={
          deleteTarget
            ? `Kya aap waqai "${deleteTarget.name}" (Rs ${deleteTarget.price}) ko database se delete karna chahte hain?`
            : ''
        }
        variant="danger"
        confirmText="Delete Item"
        cancelText="Cancel"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => !isDeleting && setDeleteTarget(null)}
      />
    </div>
  );
}
