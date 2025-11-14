export {};

declare global {
  interface RequestInit {
    duplex?: 'half';
  }
}
