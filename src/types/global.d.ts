/**
 * Global type declarations for WebTUI attributes and extensions
 */

declare module 'react' {
  interface HTMLAttributes<_T> {
    // WebTUI data attributes
    'data-box'?: string;
    'data-align'?: string;
    'data-gap'?: string;
    'data-is'?: string;
    'variant'?: string;
    'shear-'?: string;
    'box-'?: string;
    'position-'?: string;
    'container-'?: string;
    'size-'?: string;
    'is'?: string;
  }
}

export {};