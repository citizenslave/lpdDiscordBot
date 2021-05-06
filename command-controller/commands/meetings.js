'use strict';

import BaseCommand from '../baseCommand.js';

import CHANS from '../../constants/channels.js';

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
        'Pizza Delight by Giacomo',
        '67 Greentree Dr.',
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
        'Home of <@725516776993062982>',
        '119 George Ct.',
        'Bear, DE 19701'
    ],
    'DISCORD': [
        '*Efforts are being made to connect all county meetings to the Discord server through a voice channel:*',
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

        dates['NCC'] = monCurrent > today ? monCurrent : monNext;
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

        infoMsg['NCC'] = infoMsg['NCC'].join('\n');
        infoMsg['SUSSEX'] = infoMsg['SUSSEX'].join('\n');
        infoMsg['KENT'] = infoMsg['KENT'].join('\n');
        infoMsg['NCC-SOC'] = infoMsg['NCC-SOC'].join('\n');
        infoMsg['DISCORD'] = infoMsg['DISCORD'].join('\n');

        this.guild.channels.cache.get(CHANS.MEETINGS_CHAN).messages.fetch().then(msgs => {
            Promise.all(msgs.map(m => m.delete())).then(() => {
                this.guild.channels.cache.get(CHANS.MEETINGS_CHAN)
                        .send([infoMsg['NCC'], infoMsg['SUSSEX'], infoMsg['KENT'], infoMsg['NCC-SOC'], infoMsg['DISCORD']].join('\n\n'));
            });
        });
    }
}