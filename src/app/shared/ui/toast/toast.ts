import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'danger' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;

  timeoutMs: number;

  // ✅ for progress + pause/resume
  createdAt: number;
  remainingMs: number;
  paused: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = new BehaviorSubject<ToastItem[]>([]);
  toasts$ = this._toasts.asObservable();

  show(message: string, opts?: { type?: ToastType; title?: string; timeoutMs?: number }) {
    const timeoutMs = opts?.timeoutMs ?? 5000; // ✅ 5s default

    const item: ToastItem = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type: opts?.type ?? 'info',
      title: opts?.title,
      message,
      timeoutMs,

      createdAt: Date.now(),
      remainingMs: timeoutMs,
      paused: false,
    };

    this._toasts.next([item, ...this._toasts.value]);
  }

  success(message: string, title = 'Success') {
    this.show(message, { type: 'success', title });
  }
  error(message: string, title = 'Error') {
    this.show(message, { type: 'danger', title, timeoutMs: 4000 });
  }
  info(message: string, title = 'Info') {
    this.show(message, { type: 'info', title });
  }
  warning(message: string, title = 'Warning') {
    this.show(message, { type: 'warning', title });
  }

  dismiss(id: string) {
    this._toasts.next(this._toasts.value.filter(t => t.id !== id));
  }

  clear() {
    this._toasts.next([]);
  }

  // ✅ Pause/resume called by container component
  pause(id: string) {
    this._toasts.next(
      this._toasts.value.map(t => (t.id === id ? { ...t, paused: true } : t))
    );
  }

  resume(id: string) {
    this._toasts.next(
      this._toasts.value.map(t => (t.id === id ? { ...t, paused: false } : t))
    );
  }

  // ✅ update remaining time (container will call this)
  setRemaining(id: string, remainingMs: number) {
    this._toasts.next(
      this._toasts.value.map(t => (t.id === id ? { ...t, remainingMs } : t))
    );
  }
}
