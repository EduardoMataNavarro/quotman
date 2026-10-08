import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Solid black link with Lucide's "download" icon, its arrow dropping into the tray. */
@Component({
  selector: 'qm-download-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [href]="href()" [attr.download]="fileName() ?? ''">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <g class="arrow">
          <path d="m7 10 5 5 5-5" />
          <path d="M12 15V3" />
        </g>
      </svg>
      {{ label() }}
    </a>
  `,
  styles: `
    :host { display: inline-block; }
    a {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: var(--radius-control);
      background: var(--color-void);
      color: var(--color-mist);
      font-family: var(--font-heading);
      font-weight: 600;
      font-size: 15px;
      text-decoration: none;
      box-shadow: 0 8px 20px -10px rgb(2 5 6 / 0.5);
    }
    svg { width: 18px; height: 18px; flex: none; }
    .arrow { animation: drop 2.4s ease-in-out infinite; }
    @keyframes drop {
      0%, 55%, 100% { transform: translateY(0); }
      70% { transform: translateY(3px); }
      85% { transform: translateY(-1px); }
    }
    @media (prefers-reduced-motion: reduce) {
      .arrow { animation: none; }
    }
    @media print {
      :host { display: none; }
    }
  `,
})
export class DownloadButton {
  readonly href = input.required<string>();
  readonly label = input('Descargar PDF');
  readonly fileName = input<string>();
}
