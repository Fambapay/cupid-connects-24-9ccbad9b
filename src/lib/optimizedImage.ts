type TransformOpts = { width?: number; quality?: number; height?: number };
export const transformImage = (url: string, _opts?: TransformOpts) => url;
export const buildSrcSet = (
  url: string,
  _widths?: number[],
  _opts?: TransformOpts,
) => url;
