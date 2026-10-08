export class SetDarkMode {
  static readonly type = '[App] Set dark mode';
  constructor(public darkMode: boolean) {}
}

export class SetSidebarCollapsed {
  static readonly type = '[App] Set sidebar collapsed';
  constructor(public collapsed: boolean) {}
}
