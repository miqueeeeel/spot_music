const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const PLAYLISTS_FILE = path.join(__dirname, '../../data/playlists.json');

// ─── Helpers de almacenamiento ────────────────────────────────────────────────
function loadPlaylists() {
  if (!fs.existsSync(PLAYLISTS_FILE)) {
    if (!fs.existsSync(path.dirname(PLAYLISTS_FILE))) {
      fs.mkdirSync(path.dirname(PLAYLISTS_FILE), { recursive: true });
    }
    fs.writeFileSync(PLAYLISTS_FILE, '{}');
  }
  return JSON.parse(fs.readFileSync(PLAYLISTS_FILE, 'utf8'));
}

function savePlaylists(data) {
  fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(data, null, 2));
}

function getUserPlaylists(userId) {
  const all = loadPlaylists();
  return all[userId] || {};
}

function saveUserPlaylists(userId, playlists) {
  const all = loadPlaylists();
  all[userId] = playlists;
  savePlaylists(all);
}

// ─── Comando /playlist ────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('playlist')
    .setDescription('Gestiona tus playlists personales del bot')
    .addSubcommand(sub =>
      sub.setName('crear')
        .setDescription('Crea una nueva playlist')
        .addStringOption(opt => opt.setName('nombre').setDescription('Nombre de la playlist').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('añadir')
        .setDescription('Añade la canción actual a una playlist')
        .addStringOption(opt => opt.setName('playlist').setDescription('Nombre de la playlist').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('ver')
        .setDescription('Ver el contenido de una playlist')
        .addStringOption(opt => opt.setName('playlist').setDescription('Nombre de la playlist').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('lista')
        .setDescription('Lista todas tus playlists')
    )
    .addSubcommand(sub =>
      sub.setName('tocar')
        .setDescription('Reproduce una de tus playlists')
        .addStringOption(opt => opt.setName('playlist').setDescription('Nombre de la playlist').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('borrar')
        .setDescription('Borra una playlist')
        .addStringOption(opt => opt.setName('playlist').setDescription('Nombre de la playlist').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('quitar')
        .setDescription('Quita una canción de una playlist')
        .addStringOption(opt => opt.setName('playlist').setDescription('Nombre de la playlist').setRequired(true))
        .addIntegerOption(opt => opt.setName('posicion').setDescription('Número de la canción').setRequired(true).setMinValue(1))
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const playlists = getUserPlaylists(userId);

    // ── Crear ──────────────────────────────────────────────────────────────
    if (sub === 'crear') {
      const nombre = interaction.options.getString('nombre');
      if (playlists[nombre]) return interaction.reply(`❌ Ya tienes una playlist llamada **${nombre}**.`);
      playlists[nombre] = { tracks: [], createdAt: Date.now() };
      saveUserPlaylists(userId, playlists);
      return interaction.reply(`✅ Playlist **${nombre}** creada correctamente.`);
    }

    // ── Añadir canción actual ──────────────────────────────────────────────
    if (sub === 'añadir') {
      const nombre = interaction.options.getString('playlist');
      if (!playlists[nombre]) return interaction.reply(`❌ No tienes ninguna playlist llamada **${nombre}**.`);
      const queue = client.queues.get(interaction.guildId);
      if (!queue || !queue.currentTrack) return interaction.reply('❌ No hay ninguna canción reproduciéndose.');
      const track = queue.currentTrack;
      playlists[nombre].tracks.push(track);
      saveUserPlaylists(userId, playlists);
      return interaction.reply(`✅ **${track.name}** añadida a *${nombre}*.`);
    }

    // ── Ver ────────────────────────────────────────────────────────────────
    if (sub === 'ver') {
      const nombre = interaction.options.getString('playlist');
      if (!playlists[nombre]) return interaction.reply(`❌ No tienes ninguna playlist llamada **${nombre}**.`);
      const tracks = playlists[nombre].tracks;
      if (!tracks.length) return interaction.reply(`📭 La playlist **${nombre}** está vacía.`);

      const embed = new EmbedBuilder()
        .setColor('#1DB954')
        .setTitle(`📋 Playlist: ${nombre}`)
        .setDescription(
          tracks.slice(0, 15).map((t, i) =>
            `**${i + 1}.** [${t.name}](${t.url}) - *${t.artists}* (${t.duration})`
          ).join('\n')
        )
        .setFooter({ text: `${tracks.length} canciones en total` });
      return interaction.reply({ embeds: [embed] });
    }

    // ── Lista ──────────────────────────────────────────────────────────────
    if (sub === 'lista') {
      const keys = Object.keys(playlists);
      if (!keys.length) return interaction.reply('📭 No tienes ninguna playlist guardada. Usa `/playlist crear` para empezar.');
      const embed = new EmbedBuilder()
        .setColor('#1DB954')
        .setTitle(`🎵 Tus playlists`)
        .setDescription(
          keys.map(name =>
            `📋 **${name}** - ${playlists[name].tracks.length} canciones`
          ).join('\n')
        );
      return interaction.reply({ embeds: [embed] });
    }

    // ── Tocar ──────────────────────────────────────────────────────────────
    if (sub === 'tocar') {
      const nombre = interaction.options.getString('playlist');
      if (!playlists[nombre]) return interaction.reply(`❌ No tienes ninguna playlist llamada **${nombre}**.`);
      const tracks = playlists[nombre].tracks;
      if (!tracks.length) return interaction.reply(`📭 La playlist **${nombre}** está vacía.`);

      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) return interaction.reply('❌ Debes estar en un canal de voz.');

      const { getOrCreateQueue } = require('../utils/queue');
      const queue = getOrCreateQueue(client, interaction.guildId, interaction.channel);

      if (!queue.connection || queue.connection.state.status === 'destroyed') {
        const joined = await queue.join(voiceChannel);
        if (!joined) {
          client.queues.delete(interaction.guildId);
          return interaction.reply('❌ No pude conectarme al canal de voz.');
        }
      }

      await queue.addTracks([...tracks]);
      return interaction.reply(`▶️ Reproduciendo playlist **${nombre}** (${tracks.length} canciones).`);
    }

    // ── Borrar ─────────────────────────────────────────────────────────────
    if (sub === 'borrar') {
      const nombre = interaction.options.getString('playlist');
      if (!playlists[nombre]) return interaction.reply(`❌ No tienes ninguna playlist llamada **${nombre}**.`);
      delete playlists[nombre];
      saveUserPlaylists(userId, playlists);
      return interaction.reply(`🗑️ Playlist **${nombre}** eliminada.`);
    }

    // ── Quitar canción ─────────────────────────────────────────────────────
    if (sub === 'quitar') {
      const nombre = interaction.options.getString('playlist');
      if (!playlists[nombre]) return interaction.reply(`❌ No tienes ninguna playlist llamada **${nombre}**.`);
      const pos = interaction.options.getInteger('posicion') - 1;
      const tracks = playlists[nombre].tracks;
      if (pos < 0 || pos >= tracks.length) return interaction.reply('❌ Posición inválida.');
      const [removed] = tracks.splice(pos, 1);
      saveUserPlaylists(userId, playlists);
      return interaction.reply(`🗑️ **${removed.name}** eliminada de *${nombre}*.`);
    }
  },
};
