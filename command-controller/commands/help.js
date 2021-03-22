'use strict';

import BaseCommand from '../baseCommand.js';

import UTILS from '../../utils/utils.js';
import DISCORD_UTILS from '../../utils/discord-utils.js';
import COMMAND_MAPPER from '../commandMapper.js';

export default class HelpCommand extends BaseCommand {
    execute(params) {
        let helpText = '\n';
        if (!params[1] && !params[2]) params[2] = 'help';
        if (params[2]) {
            params[2] = params[2].toLowerCase();
            const helpCommand = COMMAND_MAPPER['lpd'][params[2]];
            if (helpCommand && !DISCORD_UTILS.checkMemberRoles(this.member, helpCommand.perm)) {
                helpText = `You do not have permission to run ${params[2]}.`
            } else if (helpCommand) {
                helpText += `__**LPD Bot Help for Command:**__ \`/lpd ${params[2]}\`\n\n`;
                helpText += `${helpCommand.desc}\n\n`;
                helpText += `__Syntax:__\n${helpCommand.syntax.map(s => `\`/lpd ${params[2]}${s?` ${s}`:''}\``).join('\n')}\n\n>>> `;
                helpText += (function recurseParam(root, level) {
                    if (!root.params) return '';
                    let params = Object.keys(root.params);
                    return `__Parameters:__\n${params.map(p => {
                        const recurse = recurseParam(root.params[p], level+1);
                        const reqd = `**${!root.params[p].optional}**`;
                        return `${UTILS.indent(level*2)}\`${p}\` - ${root.params[p].desc} *(Required: ${reqd})*\n`+
                                `${UTILS.indent(level*2+2)}**ie:**\t\`${root.params[p].syntax}\`\n`+
                                `${recurse?`${UTILS.indent(level*2+2)}${recurse}`:''}`;
                    }).join('')}`;
                })(helpCommand, 0);
            } else helpText = `Invalid Command: ${params[2]}`;
        } else {
            helpText += `__**LPD Bot Help (Page ${params[1]})**__\n\n`
            helpText += Object.keys(COMMAND_MAPPER['lpd'])
                    .filter(c => {
                        if (!COMMAND_MAPPER['lpd'][c].perm) return false;
                        return DISCORD_UTILS.checkMemberRoles(this.member, COMMAND_MAPPER['lpd'][c].perm) &&
                                COMMAND_MAPPER['lpd'][c].page === Number(params[1] || 0);
                    })
                    .map(c => `\`/lpd ${c}\` - ${COMMAND_MAPPER['lpd'][c].desc}`).join('\n');
            if (!helpText) helpText = `Invalid Page Number: ${params[1]}`;
        }
        return this.ephemeral(helpText);
    }
}