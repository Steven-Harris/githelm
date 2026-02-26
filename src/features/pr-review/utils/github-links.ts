export function encodeGitHubRef(ref: string): string {
  return ref
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function encodeGitHubPath(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function getGitHubFileUrl(options: {
  repoHtmlUrl?: string | null;
  ref?: string | null;
  path: string;
  fallbackUrl?: string | null;
}): string | undefined {
  const { repoHtmlUrl, ref, path, fallbackUrl } = options;

  if (!repoHtmlUrl || !ref) {
    return fallbackUrl ?? undefined;
  }

  return `${repoHtmlUrl.replace(/\/$/, '')}/blob/${encodeGitHubRef(ref)}/${encodeGitHubPath(path)}`;
}
