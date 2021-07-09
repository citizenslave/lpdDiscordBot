'use strict';

import DISCORD from 'discord.js';
import ytdl from 'ytdl-core-discord';

import BaseCommand from '../baseCommand.js';

import ROLES from '../../constants/roles.js';
import PERMS from '../../constants/permissions.js';
import UTILS from '../../utils/utils.js';
import CREDS from '../../constants/creds.js';

const SELECTIONS = [ '🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵' ];

export default class DebugCommand extends BaseCommand {
    static dispatcher;

    execute(params) {
        UTILS.postHttpsRequest(`https://graph.facebook.com/v11.0/209602722401635/feed?access_token=${CREDS.fb_access}`, { 'message': 'Test' })
    }
}