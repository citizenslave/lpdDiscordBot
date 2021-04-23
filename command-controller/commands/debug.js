'use strict';

import DISCORD from 'discord.js';

import BaseCommand from '../baseCommand.js';

import ROLES from '../../constants/roles.js';
import PERMS from '../../constants/permissions.js';

const SELECTIONS = [ '🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵' ];

export default class DebugCommand extends BaseCommand {}