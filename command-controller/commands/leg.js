'use strict';

import BaseCommand from '../baseCommand.js';

import UTILS from '../../utils/utils.js';

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

        UTILS.postHttpsRequest(LEG_SEARCH+params[1], reqBody).then(legResponse => {
            if (legResponse.Total > 1) return this.complete(`Ambiguous legislation identifier: ${params[1]}`);
            if (legResponse.Total === 0) return this.complete(`Legislation not found: ${params[1]}`);
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
                    this.complete(`Created new Legislation Channel: <#${c.id}>`);
                });
            } else {
                this.complete(`Channel already exists: <#${existingChannel.id}>`);
            }
        });
    }
}