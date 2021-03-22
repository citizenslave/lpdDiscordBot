'use strict';

import DISCORD from 'discord.js';

export default {
    'DISCORD_PERMS': DISCORD.Permissions.FLAGS,
    'SPECTATOR_PERMS': DISCORD.Permissions.FLAGS.VIEW_CHANNEL |
                DISCORD.Permissions.FLAGS.ADD_REACTIONS |
                DISCORD.Permissions.FLAGS.READ_MESSAGE_HISTORY,
    'PARTICIPANT_PERMS': DISCORD.Permissions.FLAGS.VIEW_CHANNEL |
                DISCORD.Permissions.FLAGS.READ_MESSAGE_HISTORY |
                DISCORD.Permissions.FLAGS.SEND_MESSAGES |
                DISCORD.Permissions.FLAGS.ADD_REACTIONS |
                DISCORD.Permissions.FLAGS.MENTION_EVERYONE |
                DISCORD.Permissions.FLAGS.ATTACH_FILES |
                DISCORD.Permissions.FLAGS.EMBED_LINKS |
                DISCORD.Permissions.FLAGS.USE_EXTERNAL_EMOJIS |
                DISCORD.Permissions.FLAGS.SLASH_COMMANDS,
    'ADVISOR_PERMS': DISCORD.Permissions.FLAGS.SEND_MESSAGES |
                DISCORD.Permissions.FLAGS.ADD_REACTIONS |
                DISCORD.Permissions.FLAGS.MENTION_EVERYONE |
                DISCORD.Permissions.FLAGS.ATTACH_FILES |
                DISCORD.Permissions.FLAGS.EMBED_LINKS |
                DISCORD.Permissions.FLAGS.USE_EXTERNAL_EMOJIS |
                DISCORD.Permissions.FLAGS.SLASH_COMMANDS,
    'OBSERVER_VOICE_PERMS': DISCORD.Permissions.FLAGS.VIEW_CHANNEL |
                DISCORD.Permissions.FLAGS.CONNECT,
    'SPEAKER_VOICE_PERMS': DISCORD.Permissions.FLAGS.VIEW_CHANNEL |
                DISCORD.Permissions.FLAGS.CONNECT |
                DISCORD.Permissions.FLAGS.SPEAK |
                DISCORD.Permissions.FLAGS.USE_VAD |
                DISCORD.Permissions.FLAGS.STREAM,
    'REQD_VOTE_PERMS': DISCORD.Permissions.FLAGS.SEND_MESSAGES |
                DISCORD.Permissions.FLAGS.VIEW_CHANNEL &
                ~DISCORD.Permissions.FLAGS.ADMINISTRATOR
}