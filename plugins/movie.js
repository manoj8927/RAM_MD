// Movie information via The Movie Database (TMDB). No video downloads.
const API = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w500';
const timeoutMs = 12000;

async function getJson(endpoint, key) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(API + endpoint, {
      headers: { Authorization: 'Bearer ' + key, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new Error('Invalid TMDB API credential');
      if (res.status === 429) throw new Error('TMDB rate limit reached');
      throw new Error('TMDB HTTP ' + res.status);
    }
    return await res.json();
  } finally { clearTimeout(timer); }
}
function safe(s) {
  return String(s ?? '').replace(/[\r\n]+/g, ' ').trim();
}
function duration(mins) {
  if (!Number.isFinite(mins) || mins <= 0) return 'Unknown';
  return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
}

module.exports = {
  name: 'movie-details',
  command: ['movie', 'film'],
  menu: ['movie'],
  category: 'Media',
  desc: 'Movie details: .movie <movie name>',
  async run({ sock, msg, from, text, reply, config }) {
    const name = (text || '').trim().slice(0, 120);
    if (!name) return reply('🎬 *MOVIE SEARCH*\n\nUsage: ' + (config.prefix || '.') + 'movie Pushpa 2\n\nSearch a movie title to see its poster, rating, story, cast and release date.');

    // TMDB_API_KEY accepts a TMDB v4 read-access bearer token.
    const key = process.env.TMDB_API_KEY || config.tmdbApiKey || '';
    if (!key) return reply('⚙️ Movie lookup is not configured yet.\nOwner: set TMDB_API_KEY to your TMDB API Read Access Token in hosting Variables, then restart the bot.');

    try {
      const results = await getJson('/search/movie?query=' + encodeURIComponent(name) + '&include_adult=false&language=en-US&page=1', key);
      const movie = (results.results || []).find(x => x && x.id);
      if (!movie) return reply('🔎 No movie found for: ' + name + '\nTry the full title or release year.');
      const info = await getJson('/movie/' + encodeURIComponent(movie.id) + '?append_to_response=credits&language=en-US', key);
      const cast = (info.credits?.cast || []).slice(0, 6).map(x => safe(x.name)).filter(Boolean);
      const director = (info.credits?.crew || []).find(x => x.job === 'Director');
      const genres = (info.genres || []).map(x => safe(x.name)).filter(Boolean);
      const rating = Number.isFinite(info.vote_average) && info.vote_count ? info.vote_average.toFixed(1) + '/10 (' + info.vote_count + ' votes)' : 'Not rated';
      const description = (info.overview || 'No synopsis available.').slice(0, 850);
      const caption = [
        '╭━━━━━━━━━━━━━━━━━━╮',
        '🎬 *RAM-MD MOVIE INFO*',
        '╰━━━━━━━━━━━━━━━━━━╯',
        '',
        '🎞️ *Title:* ' + safe(info.title || movie.title),
        '📅 *Release:* ' + safe(info.release_date || 'Unknown'),
        '⭐ *Rating:* ' + rating,
        '🎭 *Genres:* ' + (genres.join(', ') || 'Unknown'),
        '⏳ *Runtime:* ' + duration(info.runtime),
        '🌐 *Language:* ' + safe(info.original_language || 'Unknown').toUpperCase(),
        '🎥 *Director:* ' + (director ? safe(director.name) : 'Unknown'),
        '👥 *Cast:* ' + (cast.join(', ') || 'Not available'),
        '',
        '📖 *STORY*',
        description,
        '',
        '🔗 https://www.themoviedb.org/movie/' + info.id,
        '',
        '⚡ *RAM-MD* | Data: TMDB',
      ].join('\n');
      if (info.poster_path && /^\/[a-zA-Z0-9_.-]+$/.test(info.poster_path)) {
        try {
          return await sock.sendMessage(from, {
            image: { url: IMG + info.poster_path },
            caption,
          }, { quoted: msg });
        } catch (e) {
          console.log('Movie poster unavailable:', e.message);
        }
      }
      return reply(caption);
    } catch (e) {
      console.log('Movie lookup failed:', e.message);
      return reply('❌ Movie details unavailable. ' + (e.name === 'AbortError' ? 'Request timed out.' : e.message));
    }
  },
};
