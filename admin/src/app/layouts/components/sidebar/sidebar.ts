import { Component, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { LucideChevronLeft, LucideChevronRight, LucideDynamicIcon, LucideX } from '@lucide/angular';
import { Store } from '@ngxs/store';
import { filter, map } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SetSidebarCollapsed } from '../../../../state/app/app.actions';
import { NAV_ITEMS } from '../../../model/constants/nav/nav-items.const';

@Component({
  selector: 'qm-sidebar',
  imports: [
    RouterLink,
    ButtonModule,
    TagModule,
    TooltipModule,
    LucideDynamicIcon,
    LucideChevronLeft,
    LucideChevronRight,
    LucideX,
  ],
  templateUrl: './sidebar.html',
  host: { class: 'flex h-full flex-col' },
})
export class Sidebar {
  private store = inject(Store);
  private router = inject(Router);

  /** The current URL as a signal, so the active item re-renders without zone.js. */
  private url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Desktop icon rail; the mobile drawer is always expanded. */
  readonly collapsed = input(false);
  readonly closed = output<void>();

  protected readonly items = NAV_ITEMS;

  protected isActive(route: string): boolean {
    const path = this.url().split(/[?#]/)[0] ?? '';
    return path === route || path.startsWith(`${route}/`);
  }

  protected toggleCollapse(): void {
    this.store.dispatch(new SetSidebarCollapsed(!this.collapsed()));
  }
}
