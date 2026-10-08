import { Injectable } from '@angular/core';
import { Action, Selector, State, type StateContext } from '@ngxs/store';
import { SetDarkMode, SetSidebarCollapsed } from './app.actions';

/** UI preferences, persisted by the storage plugin (`app` key). */
export interface AppStateModel {
  /** Mirrored onto `<html>.app-dark` by `app.ts`. */
  darkMode: boolean;
  /** Desktop sidebar collapsed to its icon rail. */
  sidebarCollapsed: boolean;
}

@State<AppStateModel>({ name: 'app', defaults: { darkMode: false, sidebarCollapsed: false } })
@Injectable()
export class AppState {
  @Selector() static darkMode(s: AppStateModel): boolean {
    return s.darkMode;
  }
  @Selector() static sidebarCollapsed(s: AppStateModel): boolean {
    return s.sidebarCollapsed;
  }

  @Action(SetDarkMode)
  setDarkMode(ctx: StateContext<AppStateModel>, { darkMode }: SetDarkMode) {
    ctx.patchState({ darkMode });
  }

  @Action(SetSidebarCollapsed)
  setSidebarCollapsed(ctx: StateContext<AppStateModel>, { collapsed }: SetSidebarCollapsed) {
    ctx.patchState({ sidebarCollapsed: collapsed });
  }
}
