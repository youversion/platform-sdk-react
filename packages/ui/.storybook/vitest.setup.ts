import { setProjectAnnotations } from '@storybook/react-vite';
import { beforeEach } from 'vitest';
import * as previewAnnotations from './preview';

const _annotations = setProjectAnnotations([previewAnnotations]);

beforeEach(() => {
  localStorage?.clear?.();
  sessionStorage?.clear?.();
});
