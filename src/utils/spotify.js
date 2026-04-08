const SpotifyWebApi = require('spotify-web-api-node');

const spotify = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

let tokenExpiry = 0;

// ─── Auto-renovar token de cliente ───────────────────────────────────────────
async function ensureToken() {
  if (Date.now() < tokenExpiry) return;
  const data = await spotify.clientCredentialsGrant();
  spotify.setAccessToken(data.body.access_token);
  tokenExpiry = Date.now() + (data.body.expires_in - 60) * 1000;
  console.log('🎵 Token de Spotify renovado');
}

// ─── Buscar canción ──────────────────────────────────────────────────────────
async function searchTrack(query) {
  await ensureToken();
  const result = await spotify.searchTracks(query, { limit: 5 });
  return result.body.tracks.items.map(track => ({
    id: track.id,
    name: track.name,
    artists: track.artists.map(a => a.name).join(', '),
    album: track.album.name,
    duration: msToTime(track.duration_ms),
    url: track.external_urls.spotify,
    image: track.album.images[0]?.url,
    previewUrl: track.preview_url,
  }));
}

// ─── Obtener canción por ID ───────────────────────────────────────────────────
async function getTrack(trackId) {
  await ensureToken();
  const result = await spotify.getTrack(trackId);
  const track = result.body;
  return {
    id: track.id,
    name: track.name,
    artists: track.artists.map(a => a.name).join(', '),
    album: track.album.name,
    duration: msToTime(track.duration_ms),
    url: track.external_urls.spotify,
    image: track.album.images[0]?.url,
  };
}

// ─── Obtener playlist de Spotify ─────────────────────────────────────────────
async function getPlaylist(playlistId) {
  await ensureToken();
  const result = await spotify.getPlaylist(playlistId);
  const playlist = result.body;
  const tracks = playlist.tracks.items
    .filter(item => item.track)
    .map(item => ({
      id: item.track.id,
      name: item.track.name,
      artists: item.track.artists.map(a => a.name).join(', '),
      album: item.track.album.name,
      duration: msToTime(item.track.duration_ms),
      url: item.track.external_urls.spotify,
      image: item.track.album.images[0]?.url,
    }));
  return {
    name: playlist.name,
    description: playlist.description,
    owner: playlist.owner.display_name,
    total: playlist.tracks.total,
    image: playlist.images[0]?.url,
    tracks,
  };
}

// ─── Extraer ID de URL de Spotify ────────────────────────────────────────────
function extractSpotifyId(url, type) {
  const regex = new RegExp(`spotify\\.com\\/${type}\\/([a-zA-Z0-9]+)`);
  const match = url.match(regex);
  return match ? match[1] : null;
}

// ─── Helper: ms a tiempo legible ─────────────────────────────────────────────
function msToTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

module.exports = { searchTrack, getTrack, getPlaylist, extractSpotifyId };
