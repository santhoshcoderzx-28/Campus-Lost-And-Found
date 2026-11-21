import { useEffect, useState } from 'react';

// Minimal toast bus: any module can call showToast('Saved') without prop drilling
let listeners = [];

export function showToast(message, type = 'success') {
  const toast = { id: `${Date.now()}-${Math.random()}`, message, type };
  listeners.forEach((listener) => listener(toast));
}

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const timers = [];
    const listener = (toast) => {
      setToasts((current) => [...current, toast]);
      timers.push(
        setTimeout(() => {
          setToasts((current) => current.filter((t) => t.id !== toast.id));
        }, 3200)
      );
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>{toast.message}</div>
      ))}
    </div>
  );
}
