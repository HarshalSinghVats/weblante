export function getHostname(url) {
  return new URL(url).hostname.toLowerCase();
}

export function domainMatches(host, list) {
  return list.some(d => host === d || host.endsWith("." + d));
}
