'use strict';

import DISCORD from 'discord.js';

import BaseCommand from '../baseCommand.js';

import ROLES from '../../constants/roles.js';
import PERMS from '../../constants/permissions.js';

const SELECTIONS = [ '🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵' ];

export default class DebugCommand extends BaseCommand {
    execute(params) {
        this.channel.send('test').then(m => {
            SELECTIONS.forEach(m.react.bind(m));
            m.createReactionCollector((args, collection) => !args.bot).on('collect', (r, u) => {
                console.log(Buffer.from(r.emoji.toString()).toString('hex'));
            });
        });
    }
}