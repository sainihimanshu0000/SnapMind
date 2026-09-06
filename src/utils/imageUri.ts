export function stripFileScheme(uri: string): string {
  let path = uri.replace(/^file:\/\//, '');
  if (path.startsWith('localhost')) {
    path = path.replace(/^localhost/, '');
  }
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

/**
 * Fabric Image on iOS is picky about file URIs.
 * Always produce file:///<absolute-path>.
 */
export function toDisplayUri(uri: string): string {
  if (!uri) {
    return uri;
  }
  if (uri.startsWith('data:') || uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }
  const path = stripFileScheme(uri);
  const absolute = path.startsWith('/') ? path : `/${path}`;
  return `file://${absolute}`;
}
