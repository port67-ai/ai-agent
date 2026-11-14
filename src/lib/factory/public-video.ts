/** Only public YouTube video identifiers. No arbitrary server-side URL fetch or credentials. */
export function youtubeVideoUrl(raw: string): string {
  const u = new URL(raw);
  if (u.protocol !== 'https:' || u.username || u.password || u.port) throw new Error('Use a public HTTPS YouTube video URL');
  const host = u.hostname.toLowerCase();
  const video = host === 'youtu.be' ? u.pathname.slice(1) : ['youtube.com','www.youtube.com','m.youtube.com'].includes(host) ? u.pathname === '/watch' ? u.searchParams.get('v') : /^\/(shorts|embed)\//.test(u.pathname) ? u.pathname.split('/')[2] : null : null;
  if (!video || !/^[A-Za-z0-9_-]{11}$/.test(video)) throw new Error('Use an individual public YouTube video or Short');
  return `https://www.youtube.com/watch?v=${video}`;
}
