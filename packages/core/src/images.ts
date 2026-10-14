import type { ApiClient } from './client';
import type { Collection } from './types';
import type { GetImagesOptions, Image } from './schemas/image';

export type { GetImagesOptions };

export type ImagesClientOptions = Readonly<{
  beta?: boolean;
}>;

export class ImagesClient {
  constructor(_client: ApiClient, _options: ImagesClientOptions = {}) {}

  async getImages(_options: GetImagesOptions = {}): Promise<Collection<Image>> {
    throw new Error('not implemented');
  }

  async getImage(_imageId: string): Promise<Image> {
    throw new Error('not implemented');
  }
}
