const {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  joinVoiceChannel,
} = require('@discordjs/voice');
const playdl = require('play-dl');
const { EmbedBuilder } = require('discord.js');

// ─── Estructura de la cola ────────────────────────────────────────────────────
class MusicQueue {
  constructor(guildId, textChannel) {
    this.guildId = guildId;
    this.textChannel = textChannel;
    this.tracks = [];
    this.currentTrack = null;
    this.connection = null;
    this.player = createAudioPlayer();
    this.volume = 0.5;
    this.loop = false;
    this.isPlaying = false;

    this._setupPlayerEvents();
  }

  _setupPlayerEvents() {
    this.player.on(AudioPlayerStatus.Idle, () => {
      if (this.loop && this.currentTrack) {
        this._playTrack(this.currentTrack);
      } else {
        this.currentTrack = null;
        this.isPlaying = false;
        this._playNext();
      }
    });

    this.player.on('error', err => {
      console.error('❌ Error en el reproductor:', err.message);
      this._playNext();
    });
  }

  async join(voiceChannel) {
    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);
      this.connection.subscribe(this.player);
      return true;
    } catch {
      this.connection.destroy();
      return false;
    }
  }

  async addTrack(track) {
    this.tracks.push(track);
    if (!this.isPlaying) {
      await this._playNext();
    }
  }

  async addTracks(tracks) {
    this.tracks.push(...tracks);
    if (!this.isPlaying) {
      await this._playNext();
    }
  }

  async _playNext() {
    if (this.tracks.length === 0) {
      this.isPlaying = false;
      setTimeout(() => {
        if (!this.isPlaying && this.connection) {
          this.connection.destroy();
        }
      }, 300_000); // Desconectar tras 5 min inactivo
      return;
    }

    this.currentTrack = this.tracks.shift();
    await this._playTrack(this.currentTrack);
  }

  async _playTrack(track) {
    try {
      this.isPlaying = true;
      // Buscar en YouTube por nombre de canción + artista
      const query = `${track.name} ${track.artists}`;
      const ytResults = await playdl.search(query, { limit: 1 });

      if (!ytResults.length) {
        this.textChannel.send(`⚠️ No encontré audio para **${track.name}**, saltando...`);
        return this._playNext();
      }

      const stream = await playdl.stream(ytResults[0].url, { quality: 2 });
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true,
      });
      resource.volume?.setVolume(this.volume);

      this.player.play(resource);

      // Notificar en el canal de texto
      const embed = new EmbedBuilder()
        .setColor('#1DB954')
        .setTitle('🎵 Reproduciendo ahora')
        .setDescription(`**[${track.name}](${track.url})**`)
        .addFields(
          { name: '🎤 Artista', value: track.artists, inline: true },
          { name: '💿 Álbum', value: track.album, inline: true },
          { name: '⏱️ Duración', value: track.duration, inline: true }
        )
        .setFooter({ text: `${this.tracks.length} canciones en cola` });

      if (track.image) embed.setThumbnail(track.image);
      this.textChannel.send({ embeds: [embed] });

    } catch (err) {
      console.error('❌ Error reproduciendo:', err.message);
      this.textChannel.send(`⚠️ Error al reproducir **${track.name}**, saltando...`);
      this._playNext();
    }
  }

  skip() {
    this.player.stop();
  }

  pause() {
    return this.player.pause();
  }

  resume() {
    return this.player.unpause();
  }

  setVolume(vol) {
    this.volume = vol / 100;
    // Aplica al recurso actual si existe
    const state = this.player.state;
    if (state.status !== AudioPlayerStatus.Idle) {
      state.resource?.volume?.setVolume(this.volume);
    }
  }

  toggleLoop() {
    this.loop = !this.loop;
    return this.loop;
  }

  stop() {
    this.tracks = [];
    this.loop = false;
    this.player.stop();
    if (this.connection) {
      this.connection.destroy();
    }
  }

  getQueue() {
    return this.tracks;
  }

  destroy() {
    this.stop();
  }
}

// ─── Obtener o crear cola para un servidor ────────────────────────────────────
function getOrCreateQueue(client, guildId, textChannel) {
  if (!client.queues.has(guildId)) {
    client.queues.set(guildId, new MusicQueue(guildId, textChannel));
  }
  return client.queues.get(guildId);
}

function deleteQueue(client, guildId) {
  client.queues.delete(guildId);
}

module.exports = { MusicQueue, getOrCreateQueue, deleteQueue };
