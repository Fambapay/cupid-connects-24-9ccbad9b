export const prefetchPhotos = async (_urls?: string[]): Promise<void> => {};
export const injectPreloadLinks = (_urls?: string[]): (() => void) => {
  return () => {};
};
export const isImageReady = (_url?: string) => true;
