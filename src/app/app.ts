import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'qm-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {}
