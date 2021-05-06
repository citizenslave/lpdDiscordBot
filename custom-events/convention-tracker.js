'use strict';

import FilePersistenceEngine from '../utils/FilePersistenceEngine.js';

import ROLES from '../constants/roles.js';
import CHANS from '../constants/channels.js';

const DELEGATES_PERSISTANCE = new FilePersistenceEngine('./data/storage/delegates');
const DELEGATES_LIST = DELEGATES_PERSISTANCE.readFile();

const COUNTIES = /(?:^s$|sussex)|(?:^k$|kent)|(?:^n$|new *castle)/i

export default class ConventionTracker {
    static handleMessage(message) {
        if (message.channel.id === CHANS.CRED_REQ_CHAN) {
            if (!COUNTIES.test(message.content)) {
                message.delete({ 'timeout': 1000 });
                message.author.createDM().then(c => c.send(`Unrecognized County: ${message.content}`));
                return;
            }
            message.react('👍');
            message.react('🇳');
            message.react('🇰');
            message.react('🇸')
            message.react('👎');

            this.approveDelegate(message);
        }
    }

    static approveDelegate(message) {
        message.createReactionCollector(() => true).on('collect', (r, u) => {
            if (u.bot) return;
            const response = Buffer.from(r.emoji.toString()).toString('hex');
            const member = message.guild.members.cache.get(u.id);
            if (!member.roles.cache.has(ROLES.CRED_CMTE)) {
                r.users.remove(u.id);
                return;
            }
            
            if (response === 'f09f918d') {
                DELEGATES_LIST.push(message.author.id);
                DELEGATES_PERSISTANCE.writeFile(DELEGATES_LIST);
                if (message.member.voice && message.member.voice.channelID) message.member.voice.setChannel(CHANS.CONVENTION_CHAN);
                message.delete({ 'timeout': 1000 });
            } else if (response === 'f09f87b3') {
                if (message.member.voice && message.member.voice.channelID) message.member.voice.setChannel(CHANS.NCC_CRED_CHAN);
            } else if (response === 'f09f87b0') {
                if (message.member.voice && message.member.voice.channelID) message.member.voice.setChannel(CHANS.KENT_CRED_CHAN);
            } else if (response === 'f09f87b8') {
                if (message.member.voice && message.member.voice.channelID) message.member.voice.setChannel(CHANS.SUSSEX_CRED_CHAN);
            } else {
                message.delete({ 'timeout': 1000 });
            }
        });
    }

    static updateRole(o, n) {
        if (n.member.roles.cache.has(ROLES.DELEGATES)) {
            if (!n.selfVideo || n.channelID !== CHANS.CONVENTION_CHAN) {
                n.member.roles.remove(ROLES.DELEGATES);
                if (n.channelID && n.channelID === CHANS.CONVENTION_CHAN) n.setMute(true);
                DELEGATES_LIST.push(n.member.id);
                DELEGATES_PERSISTANCE.writeFile(DELEGATES_LIST);
            }
        } else if (n.channelID === CHANS.CONVENTION_CHAN && n.selfVideo) {
            if (DELEGATES_LIST.includes(n.member.id)) {
                n.member.roles.add(ROLES.DELEGATES);
                n.setMute(false);
                DELEGATES_LIST.splice(DELEGATES_LIST.findIndex(d => d === n.member.id), 1);
                DELEGATES_PERSISTANCE.writeFile(DELEGATES_LIST);
            }
        }
    }
}