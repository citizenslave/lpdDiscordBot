'use strict';

import HTTPS from 'https';

import BaseCommand from '../baseCommand.js';

import CHANS from '../../constants/channels.js';
import ROLES from '../../constants/roles.js';
import PERMS from '../../constants/permissions.js';

const LEG_SEARCH = 'https://legis.delaware.gov/json/Search/GetLegislation?searchTerm=';
const LEG_LINK = 'https://legis.delaware.gov/BillDetail?LegislationId=';

export default class LegCommand extends BaseCommand {
    execute(params) {
        this.ack();
        const legChannelName = params[1].toLowerCase().replace(/ +/, '');
        const existingChannel = this.guild.channels.cache.find(c => c.name === legChannelName);
        const reqBody = {
            'sort': '',
            'page': '1',
            'pageSize': '1',
            'selectedGA[0]': Math.ceil(new Date().getFullYear()/2)-860
        };
        const legSearchReq = HTTPS.request(LEG_SEARCH+params[1], {
            'method': 'POST',
            'headers': {
                'Content-Type': 'application/json'
            }
        }, res => {
            res.on('data', d => {
                const legResponse = JSON.parse(d.toString());
                if (legResponse.Total > 1) return this.complete(`Ambiguous legislation identifier: ${params[1]}`, true);
                if (legResponse.Total === 0) return this.complete(`Legislation not found: ${params[1]}`, true);
                const newLegChannel = {
                    'type': 'text',
                    'parent': CHANS.LEG_CAT,
                    'topic': LEG_LINK+legResponse.Data[0].LegislationId,
                    'permissionOverwrites':[{
                        'id': ROLES.GENERAL,
                        'type': 'role',
                        'deny': 0n,
                        'allow': PERMS.PARTICIPANT_PERMS
                    }]
                };
                if (!existingChannel || existingChannel.topic !== newLegChannel.topic) {
                    this.guild.channels.create(legChannelName, newLegChannel).then(c => {
                        this.complete(`Created new Legislation Channel: <#${c.id}>`, true);
                    });
                } else {
                    this.complete(`Channel already exists: <#${existingChannel.id}>`, true);
                }
            });
        });
        legSearchReq.on('error', console.error);
        legSearchReq.write(JSON.stringify(reqBody));
        legSearchReq.end();
    }
}