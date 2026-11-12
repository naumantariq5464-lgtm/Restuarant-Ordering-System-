import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function ConfirmDialog({ isOpen, title, message, confirmText, cancelText, onConfirm, onCancel, variant = 'primary', isLoading = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => !isLoading && onCancel()}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <AlertCircle size={22} color={variant === 'danger' ? '#DC2626' : '#142B4A'} />
          <h2 className="modal-header" style={{ margin: 0 }}>{title}</h2>
        </div>
        <p className="modal-body">{message}</p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel} disabled={isLoading}>
            {cancelText || 'Back'}
          </button>
          <button 
            className={variant === 'danger' ? 'btn-danger' : 'btn-confirm'}
            onClick={onConfirm}
            disabled={isLoading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {isLoading && <Loader2 size={15} className="spin" />}
            <span>{confirmText || 'Confirm'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
