import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { LucideKeyRound, LucideLogOut, LucideMenu, LucideMoon, LucideSun, LucideUserRound } from '@lucide/angular';
import { select, Store } from '@ngxs/store';
import { PopoverModule } from 'primeng/popover';
import { filter } from 'rxjs/operators';
import { SetDarkMode } from '../../../state/app/app.actions';
import { AppState } from '../../../state/app/app.state';
import { Logout } from '../../../state/auth/auth.actions';
import { AuthState } from '../../../state/auth/auth.state';
import { ChangePasswordDialog } from '../../auth/components/change-password-dialog/change-password-dialog';
import { Sidebar } from '../components/sidebar/sidebar';

@Component({
  selector: 'qm-authenticated-layout',
  imports: [
    RouterOutlet,
    PopoverModule,
    LucideMenu,
    LucideSun,
    LucideMoon,
    LucideLogOut,
    LucideUserRound,
    LucideKeyRound,
    ChangePasswordDialog,
    Sidebar,
  ],
  templateUrl: './authenticated-layout.html',
})
export class AuthenticatedLayout {
  private router = inject(Router);
  private store = inject(Store);

  protected me = select(AuthState.me);
  protected darkMode = select(AppState.darkMode);
  protected sidebarCollapsed = select(AppState.sidebarCollapsed);

  protected accountLabel = computed(() => `Cuenta — ${this.me()?.email ?? ''}`);
  protected themeLabel = computed(() => (this.darkMode() ? 'Modo claro' : 'Modo oscuro'));

  protected drawerOpen = signal(false);
  protected changingPassword = signal(false);

  /** <main> is the scroll region, not the window: reset it on every route change. */
  private scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');
  private lastRoutePath = '';

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.drawerOpen.set(false);
        // Same page, new query params (paging, filters): updated in place, not entered.
        const path = event.urlAfterRedirects.split(/[?#]/)[0] ?? '';
        if (path === this.lastRoutePath) return;
        this.lastRoutePath = path;
        this.scrollContainer()?.nativeElement.scrollTo({ top: 0 });
      });
  }

  protected toggleDark(): void {
    this.store.dispatch(new SetDarkMode(!this.darkMode()));
  }

  protected logout(): void {
    this.store.dispatch(new Logout());
  }
}
