const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { searchTrack, getTrack, getPlaylist, extractSpotifyId } = require('../utils/spotify');
const { getOrCreateQueue } = require('../utils/queue');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reproduce una canción o playlist de Spotify')
    .addStringOption(opt =>
      opt.setName('query')
        .setDescription('Nombre de canción, URL de Spotify o URL de playlist')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    await interaction.deferReply();

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.editReply('❌ Debes estar en un canal de voz para usar este comando.');
    }

    const query = interaction.options.getString('query');
    const queue = getOrCreateQueue(client, interaction.guildId, interaction.channel);

    // ─── Conectar al canal de voz si no está conectado ─────────────────────
    if (!queue.connection || queue.connection.state.status === 'destroyed') {
      const joined = await queue.join(voiceChannel);
      if (!joined) {
        client.queues.delete(interaction.guildId);
        return interaction.editReply('❌ No pude conectarme al canal de voz. ¿Tengo los permisos necesarios?');
      }
    }

    try {
      // ─── URL de playlist de Spotify ──────────────────────────────────────
      if (query.includes('spotify.com/playlist/')) {
        const playlistId = extractSpotifyId(query, 'playlist');
        if (!playlistId) return interaction.editReply('❌ URL de playlist inválida.');

        const playlist = await getPlaylist(playlistId);
        await queue.addTracks(playlist.tracks);

        const embed = new EmbedBuilder()
          .setColor('#1DB954')
          .setTitle('📋 Playlist añadida a la cola')
          .setDescription(`**${playlist.name}**`)
          .addFields(
            { name: '👤 Creador', value: playlist.owner, inline: true },
            { name: '🎵 Canciones', value: `${playlist.total}`, inline: true },
          )
          .setFooter({ text: `Añadida por ${interaction.user.username}` });

        if (playlist.image) embed.setThumbnail(playlist.image);
        return interaction.editReply({ embeds: [embed] });
      }

      // ─── URL de canción de Spotify ────────────────────────────────────────
      if (query.includes('spotify.com/track/')) {
        const trackId = extractSpotifyId(query, 'track');
        if (!trackId) return interaction.editReply('❌ URL de canción inválida.');

        const track = await getTrack(trackId);
        await queue.addTrack(track);

        return interaction.editReply(
          `✅ **${track.name}** de *${track.artists}* añadida a la cola.`
        );
      }

      // ─── Búsqueda por nombre ──────────────────────────────────────────────
      const results = await searchTrack(query);
      if (!results.length) return interaction.editReply('❌ No encontré ninguna canción con ese nombre.');

      const track = results[0]; // Tomar el primer resultado
      await queue.addTrack(track);

      return interaction.editReply(
        `✅ **${track.name}** de *${track.artists}* añadida a la cola.`
      );

    } catch (err) {
      console.error(err);
      return interaction.editReply('❌ Hubo un error al procesar tu solicitud.');
    }
  },
};
