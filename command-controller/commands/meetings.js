'use strict';

import BaseCommand from '../baseCommand.js';

import CHANS from '../../constants/channels.js';
import { MessageEmbed } from 'discord.js';

const MEETING_INFO = {
    'NCC': [
        '__**New Castle County LP Monthly Members Meeting:**__',
        'DATE',
        'McGlynns Pub',
        '8 Polly Drummond Shopping Center',
        'Newark, DE 19711',
        'Contact ncclp1776@gmail.com for Zoom Link'
    ],
    'KENT': [
        '__**Kent County LP Monthly Meeting:**__',
        'DATE',
        'McGlynn\'s Pub',
        '800 N State St.',
        'Dover, DE 19901'
    ],
    'SUSSEX': [
        '__**Sussex County LP Monthly Meeting:**__',
        'DATE',
        'Seaford Grottos Pizza',
        '22925 Sussex Hwy.',
        'Seaford, DE 19973'
    ],
    'NCC-SOC': [
        '__**New Castle County LP 2nd Thursday Social:**__',
        'DATE',
        'Constitution Yards Beer Garden',
        '308 Justison St.',
        'Wilmington, DE 19801'
    ],
    'DISCORD': [
        '__**Discord Information**__',
        '*Efforts are being made to connect all county meetings to the Discord server through a voice channel.  '+
        'There is no guarantee you will be able to participate in the meeting through Discord, but you might at '+
        'least be able to observe:*',
        'https://discord.gg/tma9CXkYbB'
    ]
}

export default class MeetingsCommand extends BaseCommand {
    execute(params) {
        const today = new Date();
        let monCurrent = new Date(today.getFullYear(), today.getMonth());
        let monNext = new Date(today.getFullYear(), today.getMonth() + 1);
        let thuCurrent = new Date(today.getFullYear(), today.getMonth());
        let thuNext = new Date(today.getFullYear(), today.getMonth() + 1);

        const dates = {};
        while (monCurrent.getDay() !== 1) monCurrent = new Date(monCurrent.getFullYear(), monCurrent.getMonth(), monCurrent.getDate() + 1);
        while (monNext.getDay() !== 1) monNext = new Date(monNext.getFullYear(), monNext.getMonth(), monNext.getDate() + 1);
        while (thuCurrent.getDay() !== 4) thuCurrent = new Date(thuCurrent.getFullYear(), thuCurrent.getMonth(), thuCurrent.getDate() + 1);
        while (thuNext.getDay() !== 4) thuNext = new Date(thuNext.getFullYear(), thuNext.getMonth(), thuNext.getDate() + 1);
        
        monCurrent.setHours(19,0);
        monNext.setHours(19,0);
        thuCurrent.setHours(19,0);
        thuNext.setHours(19,0);

        dates['NCC'] = monCurrent > today ? monCurrent : monNext;
        dates['NCC'] = new Date(dates['NCC'].getFullYear(), dates['NCC'].getMonth(), dates['NCC'].getDate() + 1);
        dates['KENT'] = new Date(monCurrent.getFullYear(), monCurrent.getMonth(), monCurrent.getDate() + 14);
        if (dates['KENT'] < today) dates['KENT'] = new Date(monNext.getFullYear(), monNext.getMonth(), monNext.getDate() + 14);
        dates['SUSSEX'] = new Date(monCurrent.getFullYear(), monCurrent.getMonth(), monCurrent.getDate() + 7);
        if (dates['SUSSEX'] < today) dates['SUSSEX'] = new Date(monNext.getFullYear(), monNext.getMonth(), monNext.getDate() + 7);
        dates['NCC-SOC'] = new Date(thuCurrent.getFullYear(), thuCurrent.getMonth(), thuCurrent.getDate() + 7);
        if (dates['NCC-SOC'] < today) dates['NCC-SOC'] = new Date(thuNext.getFullYear(), thuNext.getMonth(), thuNext.getDate() + 7);

        const localeOptions = { 'weekday': 'long', 'year': 'numeric', 'month': 'long', 'day': 'numeric' };
        const infoMsg = Object.assign({}, MEETING_INFO);
        infoMsg['NCC'].splice(1, 1, `${dates['NCC'].toLocaleDateString(undefined, localeOptions)} @ 7pm`);
        infoMsg['SUSSEX'].splice(1, 1, `${dates['SUSSEX'].toLocaleDateString(undefined, localeOptions)} @ 7pm`);
        infoMsg['KENT'].splice(1, 1, `${dates['KENT'].toLocaleDateString(undefined, localeOptions)} @ 7pm`);
        infoMsg['NCC-SOC'].splice(1, 1, `${dates['NCC-SOC'].toLocaleDateString(undefined, localeOptions)} @ 7pm`);

        const embed = new MessageEmbed().setTitle('Monthly Meeting Information');
        embed.addFields(['NCC', 'SUSSEX', 'KENT', 'NCC-SOC'].map(key => {
            const address = [ infoMsg[key][3], infoMsg[key][4] ];
            return {
                'name': infoMsg[key][0],
                'value': [
                    infoMsg[key][1],
                    infoMsg[key][2],
                    `[${address.join('\n')}](https://www.google.com/maps/place/${address.join(',+').replace(/ /g,'+')})`
                ].concat(infoMsg[key][5]?infoMsg[key][5]:[]).join('\n')+'\n'
            }
        }));
        embed.addField(infoMsg['DISCORD'][0], infoMsg['DISCORD'].filter((v, idx) => idx).join('\n'));

        this.guild.channels.cache.get(CHANS.MEETINGS_CHAN).messages.fetch().then(msgs => {
            Promise.all(msgs.map(m => m.delete())).then(() => {
                this.guild.channels.cache.get(CHANS.MEETINGS_CHAN).send(embed);
            });
        });
    }
}