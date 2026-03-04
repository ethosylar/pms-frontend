import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastItem } from './toast'; // adjust path if needed
import { Subscription } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-toast-container',
  imports: [CommonModule],
  templateUrl: './toast-container.html',
  styleUrls: ['./toast-container.scss'],
})
export class ToastContainerComponent implements OnDestroy {
  constructor(public toast: ToastService) {}

  private sub = new Subscription();

  // per-toast timer bookkeeping
  private intervals = new Map<string, number>();
  private lastTick = new Map<string, number>();

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.clearAllIntervals();
  }

  onEnter(t: ToastItem) {
    this.toast.pause(t.id);
    // stop ticking
    this.stopInterval(t.id);
  }

  onLeave(t: ToastItem) {
    this.toast.resume(t.id);
    // resume ticking
    this.startInterval(t.id);
  }

  trackById(_: number, t: ToastItem) {
    return t.id;
  }

  // called from template when toast renders
  ensureTimer(t: ToastItem) {
    if (this.intervals.has(t.id)) return;
    this.startInterval(t.id);
  }

  private startInterval(id: string) {
    // prevent duplicates
    this.stopInterval(id);

    this.lastTick.set(id, Date.now());
    const handle = window.setInterval(() => {
      const toasts = (this.toast as any)._toasts.value as ToastItem[]; // internal read
      const item = toasts.find(x => x.id === id);
      if (!item) {
        this.stopInterval(id);
        return;
      }
      if (item.paused) return;

      const prev = this.lastTick.get(id) ?? Date.now();
      const now = Date.now();
      const delta = now - prev;
      this.lastTick.set(id, now);

      const nextRemaining = Math.max(0, item.remainingMs - delta);
      this.toast.setRemaining(id, nextRemaining);

      if (nextRemaining <= 0) {
        this.toast.dismiss(id);
        this.stopInterval(id);
      }
    }, 50);

    this.intervals.set(id, handle);
  }

  private stopInterval(id: string) {
    const handle = this.intervals.get(id);
    if (handle != null) {
      window.clearInterval(handle);
      this.intervals.delete(id);
      this.lastTick.delete(id);
    }
  }

  private clearAllIntervals() {
    for (const id of this.intervals.keys()) this.stopInterval(id);
  }
}
