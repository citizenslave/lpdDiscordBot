'use strict';

import DISCORD from 'discord.js';

import BaseCommand from '../baseCommand.js';

import ROLES from '../../constants/roles.js';
import PERMS from '../../constants/permissions.js';

const SELECTIONS = [ '🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵' ];

export default class DebugCommand extends BaseCommand {
    execute(params) {
        this.guild.members.fetch(this.member.user.id).then(member => {
            member.user.createDM().then(channel => {
                channel.send('test').then(msg => {
                    msg.createReactionCollector(() => true, { 'dispose': true }).on('collect', (r, u) => {
                        if (r.bot) return;

                        console.log(Buffer.from(r.emoji.toString()).toString('hex'));
                    }).on('dispose', (r, u) => {
                        if (r.bot) return;

                        console.log(Buffer.from(r.emoji.toString()).toString('hex'));
                    });
                });
            });
        });
    }
}