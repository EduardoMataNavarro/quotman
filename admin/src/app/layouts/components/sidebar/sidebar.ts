import { Component, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideChevronLeft, LucideChevronRight, LucideDynamicIcon, LucideX } from '@lucide/angular';
import { Store } from '@ngxs/store';
import { SetSidebarCollapsed } from '../../../../state/app/app.actions';
import { NAV_ITEMS } from '../../../model/constants/nav/nav-items.const';

@Component({
  selector: 'qm-sidebar',
  imports: [RouterLink, RouterLinkActive, LucideDynamicIcon, LucideChevronLeft, LucideChevronRight, LucideX],
  templateUrl: './sidebar.html',
  host: { class: 'flex h-full flex-col' },
})
export class Sidebar {
  private store = inject(Store);

  /** Desktop icon rail; the mobile drawer is always expanded. */
  readonly collapsed = input(false);
  readonly closed = output<void>();

  protected readonly items = NAV_ITEMS;

  protected toggleCollapse(): void {
    this.store.dispatch(new SetSidebarCollapsed(!this.collapsed()));
  }
}
