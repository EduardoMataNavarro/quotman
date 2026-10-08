import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngxs/store';
import { MessageService } from 'primeng/api';
import { AppState } from '../state/app/app.state';
import { App } from './app';

describe('App', () => {
  it('mirrors dark mode onto <html>.app-dark', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideStore([AppState]), MessageService],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.documentElement.classList.contains('app-dark')).toBe(false);
  });
});
