# 🎵 Discord Spotify Bot

Bot de Discord que reproduce música de Spotify en canales de voz y permite gestionar playlists personales.

---

## ✨ Características

| Comando | Descripción |
|---|---|
| `/play <canción o URL>` | Reproduce una canción o playlist de Spotify |
| `/search <query>` | Busca canciones y elige cuál reproducir |
| `/skip` | Salta a la siguiente canción |
| `/stop` | Detiene la música y desconecta el bot |
| `/pause` | Pausa la reproducción |
| `/resume` | Reanuda la reproducción |
| `/queue` | Muestra la cola de canciones |
| `/nowplaying` | Muestra la canción actual |
| `/volume <0-100>` | Ajusta el volumen |
| `/loop` | Activa/desactiva el bucle |
| `/playlist crear` | Crea una playlist personal |
| `/playlist añadir` | Añade la canción actual a una playlist |
| `/playlist ver` | Ve el contenido de una playlist |
| `/playlist lista` | Lista todas tus playlists |
| `/playlist tocar` | Reproduce una playlist guardada |
| `/playlist borrar` | Elimina una playlist |
| `/playlist quitar` | Quita una canción de una playlist |

---

## 🚀 Instalación

### 1. Clona el repositorio

```bash
git clone <tu-repo>
cd discord-spotify-bot
npm install
```

### 2. Configura las credenciales

Copia el archivo de ejemplo y rellena tus credenciales:

```bash
cp .env.example .env
```

Edita `.env`:

```env
DISCORD_TOKEN=tu_token_aqui
DISCORD_CLIENT_ID=tu_client_id_aqui
DISCORD_GUILD_ID=tu_guild_id_aqui   # Solo para desarrollo
SPOTIFY_CLIENT_ID=tu_spotify_client_id
SPOTIFY_CLIENT_SECRET=tu_spotify_client_secret
```

### 3. Registra los comandos

```bash
npm run deploy-commands
```

### 4. Arranca el bot

```bash
npm start
# o en modo desarrollo:
npm run dev
```

---

## 🔑 Cómo obtener las credenciales

### Discord
1. Ve a https://discord.com/developers/applications
2. Crea una nueva aplicación
3. Ve a **Bot** → crea un bot → copia el **Token**
4. En **OAuth2 → General** copia el **Client ID**
5. Para el **Guild ID**: activa el "Modo Desarrollador" en Discord → clic derecho en tu servidor → "Copiar ID"

**Permisos necesarios del bot (Scopes):**
- `bot`
- `applications.commands`

**Permisos del bot:**
- Send Messages
- Connect
- Speak
- Use Voice Activity
- Embed Links

### Spotify
1. Ve a https://developer.spotify.com/dashboard
2. Crea una nueva aplicación
3. Copia el **Client ID** y **Client Secret**

---

## 📁 Estructura del proyecto

```
discord-spotify-bot/
├── src/
│   ├── commands/
│   │   ├── play.js          # /play
│   │   ├── search.js        # /search
│   │   ├── music.js         # /skip /stop /pause /resume /queue /volume /loop /nowplaying
│   │   └── playlist.js      # /playlist (CRUD completo)
│   ├── events/
│   │   ├── ready.js         # Evento de inicio
│   │   └── interactionCreate.js  # Manejo de comandos
│   ├── utils/
│   │   ├── spotify.js       # API de Spotify
│   │   └── queue.js         # Gestor de cola de música
│   ├── deploy-commands.js   # Script de registro de comandos
│   └── index.js             # Entrada principal
├── data/                    # Playlists guardadas (auto-generado)
├── .env.example
├── .gitignore
└── package.json
```

---

## ⚙️ Cómo funciona

El bot usa la **API de Spotify** para obtener información de canciones y playlists (nombre, artista, álbum, portada), y luego usa **play-dl** para buscar y reproducir el audio desde YouTube automáticamente. Esto evita las restricciones de la API de Spotify que no permite streaming directo.

---

## 📝 Notas

- Las playlists personales se guardan en `data/playlists.json`
- El bot se desconecta automáticamente tras 5 minutos de inactividad
- Se puede usar con URLs de Spotify directas o con el nombre de la canción
