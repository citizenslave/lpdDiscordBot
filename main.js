'use strict';

const DISCORD = require('discord.js');

const FilePersistanceEngine = require('./FilePersistenceEngine');
const DISCORD_CREDS = require('./discord_creds');

const CLIENT = new DISCORD.Client();

const HELP_TEXT = [`Anyone can run this command:`,``,`\`/lpd poll Is this how I make a poll?\``,
        `This command will generate a poll that is open to anyone with full access `+
        `to the channel it's created in, offering three voting options (Yes, Abstain, `+
        `No) and buttons to view the current vote state, move the poll to the end of the `+
        `channel, or close the poll.`,``,
        `These commands can only be run by the State Board:`,``,
        `\`/lpd exec Executive Session Name\``,
        `This command will create a new executive session channel under the "Executive Sessions" `+
        `channel category.  By default, it will only be accessible to the State Board and no other `+
        `users will know of its existence.`,``,
        `\`/lpd lock #test-session\``,
        `This command will lock an executive session so it becomes read-only to those who already have access to it.`,``,
        `\`/lpd release #test-session\``,
        `This command releases the session to all users for viewing.`,``,
        `\`/lpd role @State Board Guests @Also Will McVay\``,
        `This command can add a user to a "temporary role" (which currently just includes the <@&821788308912078858> role).  `+
        `Running it again removes them.`,``,
        `\`/lpd role @State Board Guests @Convention Committee\``,
        `This command adds everyone in the second role to the temporary role, ie everyone on the Convention Committee would `+
        `become a State Board Guest.  It will not remove them by running it again.`,``,
        `\`/lpd role @State Board Guests clear\``,
        `This will clear everyone out of a temporary role.`,``,
        `\`/lpd role #2021-convention-session @Convention Committee\``,
        `This command gives an entire role full access to a channel.  Running it again removes them.  It will not work if that `+
        `role has less than full access to the channel already.`,``,
        `\`/lpd role #2021-convention-session @Also Will McVay\``,
        `This command gives a single user full access to a channel.  Running it again removes them.`,``,
        `\`/lpd role #2021-convention-session clear\``,
        `This command removes all users granted individual access to a channel.`
    ];
const RULES = `1. No commercial spam. This is a political party server. We are not here shopping except for candidates `+
        `and political campaign items.\n`+
        `2. Be respectful. We are all either Libertarians or guests looking to learn more about the Libertarian Party. Your `+
        `behavior on this server reflects on the party. Behave accordingly. Also, this is a volunteer organization. Volunteers `+
        `have a choice how they spend their time and spending their time helping us merits gratitude, not disrespect.\n`+
        `3. Read the room. Do not post the same thing over and over again if it is clear no one is interested. This is not your `+
        `server for your own personal crusades, it is for coordinating action and educating the public for the LP.\n`+
        `4. Honesty. We try to share accurate information here and hold ourselves to a higher standard of truthfulness and transparency.\n`+
        `5. Use your real name if you need permissions granted for any particular channel or purpose to aid in verifying your identity.\n\n`+

        `Please pet the :hedgehog: to accept these rules and access the rest of the server.`;
const LPD_LINKS = [`State Links: 
    http://lpdelaware.org/
    https://www.facebook.com/LPDel/
    https://www.facebook.com/groups/lpdFB/
    https://discord.gg/j5nRAFZEuZ`,

    `Articles of Association:
    https://www.lpdelaware.org/p/revised-articles-of-association.html

    LPD Activism App:
    https://app.lpdelaware.org/

    New Castle County Links:
    https://www.newcastlecountylp.com/
    https://www.facebook.com/ncclpde/

    Articles of Association:
    https://bit.ly/2NSylEb

    Kent County Links:
    https://www.facebook.com/kcdelp/

    Sussex County Links:
    https://www.facebook.com/sussexlp/`];

const voteMap = { 'f09f918d': 'aye', 'f09f9aab': 'abstain', 'f09f918e': 'nay' };
const SEAN = '814892496139190322';
const WILL = '814614126298529843';
const ADMIN = '815639397860769813';
const STATE_BOARD = '814623899156217936';
const GENERAL = '815636524296962089';
const EXEC_SESSION_CAT = '821750119719895091';
const EXEC_ARCH_CAT = '821809580001591387';
const PRIVATE_CAT = '817403192954322945';
const BOT_ROLES = [
    '815574645422948353', // Pollmaster
    '815634266313850910', // RulesBot
    '816086519898308657', // LPD Bot
    '815592628375650354'  // State Chair
];
const TEMP_ROLES = [
    '820727133860659261' // State Board Guests
];
const DISCORD_PERMS = DISCORD.Permissions.FLAGS;
const SPECTATOR_PERMS = DISCORD_PERMS.VIEW_CHANNEL | DISCORD_PERMS.READ_MESSAGE_HISTORY;
const PARTICIPANT_PERMS = SPECTATOR_PERMS | DISCORD_PERMS.SEND_MESSAGES | DISCORD_PERMS.ADD_REACTIONS | DISCORD_PERMS.MENTION_EVERYONE |
        DISCORD_PERMS.ATTACH_FILES | DISCORD_PERMS.EMBED_LINKS | DISCORD_PERMS.USE_EXTERNAL_EMOJIS | DISCORD_PERMS.SLASH_COMMANDS;
const OBSERVER_VOICE_PERMS = DISCORD_PERMS.VIEW_CHANNEL | DISCORD_PERMS.CONNECT;
const SPEAKER_VOICE_PERMS = OBSERVER_VOICE_PERMS | DISCORD_PERMS.SPEAK | DISCORD_PERMS.USE_VAD | DISCORD_PERMS.STREAM;

let voteId = 0;
const VOTE_PERSISTANCE = new FilePersistanceEngine('./voteData.json');
const voteData = VOTE_PERSISTANCE.readFile();

const RULE_PERSISTANCE = new FilePersistanceEngine('./ruleData.json');
const ruleData = RULE_PERSISTANCE.readFile();

function processCommand(command, fullCommand) {
    console.log(command);
    let channel, rolesCache, guild;

    guild = CLIENT.guilds.cache.get(fullCommand.guild_id);
    channel = guild.channels.cache.get(fullCommand.channel_id);
    rolesCache = guild.roles.cache;

    const args = command.split(/ +/);
    const cmd = args.shift().toLowerCase();
    const content = command.slice(cmd.length+1);

    switch (cmd) {
        case 'help':
            if (!fullCommand.member.roles.includes(STATE_BOARD))
                return ephemeral(HELP_TEXT.filter((v, idx) => idx < 5).join('\n'), fullCommand);
            if (fullCommand.member.roles.includes(STATE_BOARD) && !content.length)
                return ephemeral(HELP_TEXT.join('\n'), fullCommand);
            switch (args[0]) {
            case 'exec':
            case 'lock':
            case 'release':
                return ephemeral(HELP_TEXT.filter((v, idx) => idx > 6 && idx < 15).join('\n'), fullCommand);
            case 'role':
                return ephemeral(HELP_TEXT.filter((v, idx) => idx > 15).join('\n'), fullCommand);
            default:
                return ephemeral(`Unrecognized command: ${content}`, fullCommand);
            }
            break;
        case 'ping':
            if (!fullCommand.member.roles.includes(ADMIN)) return ephemeral('No permission.', fullCommand);
            ephemeral('pong', fullCommand);
            break;
        case 'rules':
            if (!fullCommand.member.roles.includes(ADMIN)) return ephemeral('No permission.', fullCommand);
            ephemeral(null, fullCommand);
            const rulesEmbed = new DISCORD.MessageEmbed().setDescription(RULES).setTitle('LPD Server Rules');
            channel.send(rulesEmbed).then(message => {
                while (ruleData.length) ruleData.pop();
                ruleData.push({ 'guildId': guild.id, 'channelId': channel.id, 'messageId': message.id });
                RULE_PERSISTANCE.writeFile(ruleData);
                manageRules(ruleData[0].guildId, ruleData[0].channelId, ruleData[0].messageId);
            });
            break;
        case 'list':
            if (!fullCommand.member.roles.includes(ADMIN)) return ephemeral('No permission.', fullCommand);
            ephemeral(null, fullCommand);
            // channel.messages.fetch().then(messages => {
            //     messages.forEach(m => {
            //         console.log(m.content);
            //     });
            // });
            // guild.members.fetch().then(members => {
            //     members.each(m => {
            //         console.log(`${m.user.username}: ${m.id}`);
            //     });
            // });
            // CLIENT.emojis.cache.array().forEach(e => {
            //     console.log(`${e.name}: ${e.identifier}`);
            // });
            // guild.roles.fetch().then(roles => {
            //     roles.cache.forEach(r => {
            //         console.log(`${r.name}: ${r.id}`);
            //     });
            // });
            // guild.members.fetch().then(m => {
            //     console.log(m.filter(i=>i.roles.cache.intersect(new DISCORD.Collection([['814623899156217936',null]])).size).map(i => i.nickname || i.user.username));
            //     // console.log(m.filter(i => i.roles.cache.intersect(['814623899156217936']).size).map(i => i.nickname));
            // });
            // console.log(channel.permissionOverwrites);
            // console.log(channel.permissionOverwrites.get('814623899156217936').allow.bitfield, PARTICIPANT_PERMS);
            // console.log(guild.channels.cache.map(c => c.name === 'Private Meeting Room'?c.name:false));
            // const pvtChan = guild.channels.cache.filter(c => c.name === 'Private Meeting Room').first();
            // console.log(pvtChan.permissionOverwrites.get('814623899156217936').allow.bitfield, SPEAKER_VOICE_PERMS);
            // console.log(guild.channels.cache.map(c => `${c.name}: ${c.id}`));
            break;
        case 'clear':
            if (!fullCommand.member.roles.includes(ADMIN)) return ephemeral('No permission.', fullCommand);
            if (!fullCommand.recursed) ephemeral(null, fullCommand);
            channel.messages.fetch({ 'limit': 5 }).then(messages => {
                Promise.all(messages.map(message => message.delete())).then(() => {
                    if (messages.size) processCommand(command, Object.assign({ 'recursed': true }, fullCommand));
                }).catch(console.log);
            });
            break;
        case 'role':
            const userToRole = args[0].match(/<@&(.+)><@!(.+)>/);
            const copyToRole = args[0].match(/<@&(.+)><@&(.+)>/);
            const roleToChannel = args[0].match(/<#(.+)><@&(.+)>/);
            const userToChannel = args[0].match(/<#(.+)><@!(.*)>/);
            const roleAction = args[0].match(/<@&(.+)>/);
            const channelAction = args[0].match(/<#(.*)>/);

            if (userToRole) {
                const newRole = userToRole[1];
                const userToAdd = userToRole[2];
                if ((!fullCommand.member.roles.includes(STATE_BOARD) || !TEMP_ROLES.includes(newRole)) &&
                    !fullCommand.member.roles.includes(ADMIN)) return ephemeral('No permission.', fullCommand);
                guild.members.fetch(userToAdd).then(member => {
                    if (member.roles.cache.has(newRole)) {
                        member.roles.remove(newRole);
                        ephemeral('User role revoked', fullCommand);
                    } else {
                        member.roles.add(newRole);
                        ephemeral('User role granted', fullCommand);
                    }
                });
            } else if (copyToRole) {
                const srcRole = copyToRole[2];
                const dstRole = copyToRole[1];
                if ((!fullCommand.member.roles.includes(STATE_BOARD) || !TEMP_ROLES.includes(dstRole)) &&
                    !fullCommand.member.roles.includes(ADMIN)) return ephemeral('No permission.', fullCommand);
                guild.members.fetch().then(members => {
                    const membersAdded = [];
                    members.forEach(member => {
                        if (member.roles.cache.has(srcRole) && !member.roles.cache.has(dstRole)) {
                            member.roles.add(dstRole);
                            membersAdded.push(member.nickname || member.user.username);
                        }
                    });
                    const response = `Added members:\n${membersAdded.join('\n')}`;
                    ephemeral(response, fullCommand);
                });
            } else if (roleToChannel) {
                const roleChannel = roleToChannel[1];
                const channelRole = roleToChannel[2];
                if (!fullCommand.member.roles.includes(ADMIN) && !fullCommand.member.roles.includes(STATE_BOARD))
                    return ephemeral('No permission.', fullCommand);
                const argChannel = guild.channels.cache.get(roleChannel);
                const currentOverwrites = argChannel.permissionOverwrites;
                if (currentOverwrites.has(channelRole)) {
                    if ((BigInt(currentOverwrites.get(channelRole).allow.bitfield) | DISCORD_PERMS.SLASH_COMMANDS) === PARTICIPANT_PERMS) {
                        ephemeral('Remove permissions from channel.', fullCommand);
                        currentOverwrites.delete(channelRole);
                        argChannel.overwritePermissions(currentOverwrites);
                    } else {
                        ephemeral('Different permissions already assigned.', fullCommand);
                    }
                } else {
                    ephemeral('Assign participant permissions to channel.', fullCommand);
                    currentOverwrites.set(channelRole,
                            new DISCORD.PermissionOverwrites(argChannel, { 'id': channelRole, 'allow': PARTICIPANT_PERMS, 'type': 'role' }));
                    argChannel.overwritePermissions(currentOverwrites);
                }
            } else if (userToChannel) {
                if (!fullCommand.member.roles.includes(ADMIN) && !fullCommand.member.roles.includes(STATE_BOARD))
                    return ephemeral('No permission.', fullCommand);
                const userChannel = guild.channels.cache.get(userToChannel[1]);
                if (userChannel.permissionOverwrites.has(userToChannel[2])) {
                    userChannel.overwritePermissions(userChannel.permissionOverwrites.filter(o => o.id !== userToChannel[2]));
                    ephemeral('Removing user from channel.', fullCommand);
                } else {
                    userChannel.overwritePermissions(userChannel.permissionOverwrites.set(userToChannel[2],
                            new DISCORD.PermissionOverwrites(userChannel, { 'id': userToChannel[2], 'allow': PARTICIPANT_PERMS, 'type': 'member' })));
                    ephemeral('Adding user to channel.', fullCommand);
                }
            } else if (roleAction) {
                if ((!fullCommand.member.roles.includes(STATE_BOARD) || !TEMP_ROLES.includes(roleAction[1])) &&
                    !fullCommand.member.roles.includes(ADMIN)) return ephemeral('No permission.', fullCommand);
                guild.roles.fetch(roleAction[1]).then(role => {
                    if (args[1] === 'clear') {
                        if (!TEMP_ROLES.includes(roleAction[1])) return ephemeral('Not a temp role.', fullCommand);
                        guild.members.fetch().then(members => {
                            members.forEach(member => {
                                if (member.roles.cache.has(role.id)) member.roles.remove(role.id);
                            });
                            return ephemeral('Cleared role.', fullCommand);
                        });
                    }
                }, e => ephemeral('Invalid role.', fullCommand));
            } else if (channelAction) {
                if (!fullCommand.member.roles.includes(ADMIN) && !fullCommand.member.roles.includes(STATE_BOARD))
                    return ephemeral('No permission.', fullCommand);
                const actionChannel = guild.channels.cache.get(channelAction[1]);
                if (args[1] === 'clear') {
                    ephemeral('Cleared user overwrites in channel.', fullCommand);
                    actionChannel.overwritePermissions(actionChannel.permissionOverwrites.filter(o => o.type !== 'member'));
                }
            } else {
                ephemeral('Invalid parameters.', fullCommand);
            }
            break;
        case 'sock':
            if (!fullCommand.member.roles.includes(ADMIN)) return ephemeral('No permission.', fullCommand);
            let targetChannel;
            let sockMsg = content;
            ephemeral(null, fullCommand);
            if (args[0].startsWith('<#')) targetChannel = guild.channels.cache.get(args[0].match(/<#(.*)>/)[1]);
            else targetChannel = guild.channels.cache.find(c => c.name === args[0]);
            if (!targetChannel) targetChannel = channel;
            else sockMsg = content.slice(args[0].length+1).trim();
            targetChannel.send(sockMsg);
            break;
        case 'link':
            if (!fullCommand.member.roles.includes(ADMIN)) return ephemeral('No permission.', fullCommand);
            const adminChannel = guild.channels.cache.get('815634898055987290');
            adminChannel.send(args[0]).then(tempMsg => {
                let embed = new DISCORD.MessageEmbed(tempMsg.embeds[0]);
                if (!embed.url) embed.url = args[0];
                embed.setTitle(content.slice(args[0].length+1).trim() || embed.title);
                channel.send(embed);
                tempMsg.delete({ 'timeout': 5000 });
                ephemeral(null, fullCommand);
            });
            break;
        case 'links':
            if (!fullCommand.member.roles.includes(ADMIN)) return ephemeral('No permission.', fullCommand);
            channel.send(LPD_LINKS[0]);
            channel.send(LPD_LINKS[1]);
            ephemeral(null, fullCommand);
            break;
        case 'exec':
            if (!fullCommand.member.roles.includes(STATE_BOARD)) return ephemeral('No permission.', fullCommand);
            const execChannelName = content.replace(/ /, '-').toLowerCase();
            ephemeral(`Creating Executive Session: ${execChannelName}`, fullCommand);
            const execChannelOptions = {
                'type': 'text',
                'parent': EXEC_SESSION_CAT,
                'permissionOverwrites': [{
                    'id': STATE_BOARD,
                    'type': 'role',
                    'deny': 0n,
                    'allow': PARTICIPANT_PERMS
                }]
            };
            guild.channels.create(execChannelName, execChannelOptions);
            break;
        case 'lock':
            if (!fullCommand.member.roles.includes(STATE_BOARD)) return ephemeral('No permission.', fullCommand);
            const lockChannelId = args[0].match(/<#(.*)>/);
            if (!lockChannelId) return ephemeral('Invalid channel.', fullCommand);
            const lockChannel = guild.channels.cache.get(lockChannelId[1]);
            ephemeral(`Locking channel: ${lockChannel.name}`, fullCommand);
            lockChannel.overwritePermissions(lockChannel.permissionOverwrites.map(overwrite => {
                return new DISCORD.PermissionOverwrites(lockChannel, { 'id': overwrite.id, 'allow': SPECTATOR_PERMS, 'type': overwrite.type });
            }));
            lockChannel.setParent(EXEC_ARCH_CAT, { 'lockPermissions': false });
            lockChannel.send(`This channel was locked on ${new Date().toISOString()}.`);
            break;
        case 'release':
            if (!fullCommand.member.roles.includes(STATE_BOARD)) return ephemeral('No permission.', fullCommand);
            const releaseChannelId = args[0].match(/<#(.*)>/);
            if (!releaseChannelId) return ephemeral('Invalid channel.', fullCommand);
            const releaseChannel = guild.channels.cache.get(releaseChannelId[1]);
            ephemeral(`Releasing channel: ${releaseChannel.name}`, fullCommand);
            releaseChannel.overwritePermissions(releaseChannel.permissionOverwrites.set(GENERAL,
                    new DISCORD.PermissionOverwrites(releaseChannel, { 'id': GENERAL, 'allow': SPECTATOR_PERMS, 'type': 'role' })));
            releaseChannel.send(`This channel was released on ${new Date().toISOString()}.`);
            break;
        case 'channel':
            if (!fullCommand.member.roles.includes(ADMIN)) return ephemeral('No permission.', fullCommand);
            else ephemeral(null, fullCommand);
            const channelName = args[0];
            const roles = args[1].match(/<@&(.+)><@&(.+)>/);
            const participantRole = roles[1];
            const spectatorRole = roles[2];
            const channelOptions = {
                'type': 'text',
                'parent': PRIVATE_CAT,
                'permissionOverwrites': [{
                    'id': participantRole,
                    'type': 'role',
                    'deny': 0n,
                    'allow': PARTICIPANT_PERMS
                }]
            };
            if (spectatorRole !== participantRole) channelOptions.permissionOverwrites.push({
                'id': spectatorRole,
                'type': 'role',
                'deny': 0n,
                'allow': SPECTATOR_PERMS
            });
            guild.channels.create(channelName, channelOptions);
            break;
        case 'poll':
            const permittedRoles = [];
            if (!content) return ephemeral('No question provided.', fullCommand);
            const initDate = new Date();
            const doneDate = new Date(initDate.getTime()+(48*60*60*1000));
            const responses = `:+1: - Aye - 0 votes in favor\n:no_entry_sign: - Abstain - 0 abstentions\n:-1: - Nay - 0 votes against`;
            const instructions = `:grey_question: - Show current votes\n:arrows_counterclockwise: - Move poll to bottom\n:x: - Delete poll (DON'T)`;
            let embed = new DISCORD.MessageEmbed().setTitle(content).setAuthor('Vote Called')
                    .addField('React Below to Vote:', responses).addField('Instructions:', instructions)
                    .setDescription(`Closes ${doneDate.toLocaleDateString()} @ ${doneDate.toLocaleTimeString(undefined, { 'timeZoneName': 'short' })}`);
            const roleFlags = DISCORD.Permissions.FLAGS;
            guild.roles.fetch().then(roles => {
                roles.cache.forEach(role => {
                    const bitfield = BigInt(channel.permissionsFor(role.id).bitfield);
                    if ((bitfield & roleFlags.SEND_MESSAGES) && (bitfield & roleFlags.VIEW_CHANNEL) && !(bitfield & roleFlags.ADMINISTRATOR))
                        permittedRoles.push(role);
                });
                const filteredRoles = permittedRoles.filter(role => !BOT_ROLES.includes(role.id));
                if (!filteredRoles.filter(role => rolesCache.has(role))) return ephemeral('No permission.', fullCommand);
                else ephemeral(null, fullCommand);
                const roleMentions = filteredRoles.map(role => `<@&${role.id}>`).join(', ');
                channel.send(`Poll for ${roleMentions}`, embed).then(message => {
                    const voteDetails = {
                        'voteId': voteId++,
                        'question': content,
                        'initDate': initDate.toISOString(),
                        'doneDate': doneDate.toISOString(),
                        'roles': filteredRoles.map(r => r.id),
                        'guild': guild.id,
                        'channel': channel.id,
                        'message': message.id,
                        'votes': []
                    };
                    voteData.push(voteDetails);
                    VOTE_PERSISTANCE.writeFile(voteData);
                    message.react('👍');
                    message.react('🚫');
                    message.react('👎');
                    message.react('❔');
                    message.react('🔄');
                    message.react('❌');

                    message.pin();
                    setTimeout(() => {
                        if (channel.lastMessage.system) channel.lastMessage.delete({ 'timeout': 1000 });
                    }, 5000);

                    registerListener(message, voteDetails);
                });
            });
            break;
        default:
            const error = `Invalid Command: ${cmd}:\n<${args.length?args:'no args'}>`;
            ephemeral(error, fullCommand);
            break;
    }
}

function displayPoll(voteDetails) {
    return new Promise((resolve, reject) => {
        CLIENT.guilds.fetch(voteDetails.guild).then(guild => {
            const channel = guild.channels.cache.get(voteDetails.channel);
            if (channel.lastMessageID === voteDetails.message) return resolve(voteDetails.message);
            channel.messages.fetch(voteDetails.message).then(message => {
                message.delete();
                const embed = new DISCORD.MessageEmbed(message.embeds[0]);
                channel.send(message.content, embed).then(freshMsg => {
                    voteDetails.message = freshMsg.id;
                    VOTE_PERSISTANCE.writeFile(voteData);
                    freshMsg.react('👍');
                    freshMsg.react('🚫');
                    freshMsg.react('👎');
                    freshMsg.react('❔');
                    freshMsg.react('🔄');
                    freshMsg.react('❌');

                    freshMsg.pin();
                    setTimeout(() => {
                        if (channel.lastMessage.system) channel.lastMessage.delete({ 'timeout': 1000 });
                    }, 5000);

                    registerListener(freshMsg, voteDetails);
                    resolve(freshMsg.id);
                });
            }, (e) => {
                const responses = `:+1: - Aye - 0 votes in favor\n:no_entry_sign: - Abstain - 0 abstentions\n:-1: - Nay - 0 votes against`;
                const instructions = `:grey_question: - Show current votes\n:arrows_counterclockwise: - Move poll to bottom\n:x: - Delete poll (DON'T)`;
                let embed = new DISCORD.MessageEmbed().setTitle(voteDetails.question).setAuthor('Vote Called')
                        .addField('React Below to Vote:', responses).addField('Instructions:', instructions)
                        .setDescription(`Closes ${new Date(voteDetails.doneDate).toLocaleDateString()} @ ${new Date(voteDetails.doneDate).toLocaleTimeString(undefined, { 'timeZoneName': 'short' })}`);
                const roleMentions = voteDetails.roles.map(role => `<@&${role}>`).join(', ');
                // console.log(roleMentions, embed)
                channel.send(`Poll for ${roleMentions}`, embed).then(freshMsg => {
                    voteDetails.message = freshMsg.id;
                    VOTE_PERSISTANCE.writeFile(voteData);
                    freshMsg.react('👍');
                    freshMsg.react('🚫');
                    freshMsg.react('👎');
                    freshMsg.react('❔');
                    freshMsg.react('🔄');
                    freshMsg.react('❌');

                    freshMsg.pin();
                    setTimeout(() => {
                        if (channel.lastMessage.system) channel.lastMessage.delete({ 'timeout': 1000 });
                    }, 5000);

                    registerListener(freshMsg, voteDetails);
                    resolve(freshMsg.id);
                });
            });
        });
    });
}

function registerListener(message, voteDetails) {
    const reactions = message.createReactionCollector(() => true, {});
    reactions.on('collect', (r, u) => {
        if (u.bot) return;
        let guild;
        const embed = message.embeds[0];

        guild = CLIENT.guilds.cache.get(voteDetails.guild);

        r.users.remove(u);
        guild.members.fetch().then(members => {
            const eligibleRoles = new DISCORD.Collection(voteDetails.roles.map(r => [r, null]));
            const eligibleIds = members.filter(i => i.roles.cache.intersect(eligibleRoles).size).map(i => i.id)
            const member = members.get(u.id);
            if (!eligibleIds.includes(u.id)) return;
            const embedUpdate = new DISCORD.MessageEmbed(embed);
            const votes = { 'f09f918d': 0, 'f09f9aab': 0, 'f09f918e': 0 };
            const closingTime = new Date(voteDetails.doneDate);
            voteDetails.votes.forEach(vote => votes[vote.voteHash]++);
            const voteHash = Buffer.from(r.emoji.toString()).toString('hex');
            if (!Object.keys(votes).includes(voteHash) || new Date() > closingTime) {
                if (voteHash === 'e29d8c' || new Date() > closingTime) {
                    if (voteHash === 'e29d8c') {
                        if (u.id !== guild.ownerID && !member.roles.cache.has('815592628375650354')) return;
                    }
                    const voteMsg = voteDetails.votes.map(vote => {
                        return `<@!${vote.user}> - ${vote.vote}`;
                    }).join('\n');
                    const infoMsg = {
                        'data': {
                            'content': `Vote Results (as of ${new Date().toLocaleString()}):\n${voteDetails.question}\n${voteMsg}`
                        }
                    }
                    CLIENT.api.channels(voteDetails.channel).messages.post(infoMsg);
                    reactions.stop();
                    r.message.delete();
                    voteData.filter((vote, idx) => vote.voteId !== voteDetails.voteId || voteData.splice(idx, 1));
                    VOTE_PERSISTANCE.writeFile(voteData);
                } else if (voteHash === 'e29d94') {
                    const voteMsg = voteDetails.votes.map(vote => {
                        return `<@!${vote.user}> - ${vote.vote}`;
                    }).join('\n') + '\n' + eligibleIds.filter(id => !voteDetails.votes.map(v => v.user).includes(id)).map(id => `<@!${id}> - Awaiting Vote`).join('\n');
                    const infoMsg = {
                        'data': {
                            'content': `Vote Results (as of ${new Date().toLocaleString()}):\n${voteDetails.question}\n${voteMsg}`,
                            'message_reference': { 'message_id': voteDetails.message }
                        }
                    }
                    CLIENT.api.channels(voteDetails.channel).messages.post(infoMsg).then(message => {
                        guild.channels.cache.get(voteDetails.channel).messages.fetch(message.id).then(m => m.delete({ 'timeout': 20000 }));
                    });
                } else if (voteHash === 'f09f9484') {
                    displayPoll(voteDetails);
                }
                return;
            }
            let currentVoteIdx = -1;
            const currentVote = voteDetails.votes.filter((vote, idx) => {
                if (u.id === vote.user) {
                    currentVoteIdx = idx;
                    return true;
                } else return false;
            });
            if (!currentVote.length) {
                voteDetails.votes.push({ 'user': u.id, 'voteHash': voteHash, 'vote': voteMap[voteHash] });
                votes[voteHash]++;
            } else {
                voteDetails.votes.splice(currentVoteIdx, 1, { 'user': u.id, 'voteHash': voteHash, 'vote': voteMap[voteHash] });
                votes[currentVote[0].voteHash]--;
                votes[voteHash]++;
            }
            VOTE_PERSISTANCE.writeFile(voteData);
            const voteUpdate = `:+1: - Aye - ${votes['f09f918d']} votes in favor\n`+
                    `:no_entry_sign: - Abstain - ${votes['f09f9aab']} abstentions\n`+
                    `:-1: - Nay - ${votes['f09f918e']} votes against`;
            embedUpdate.spliceFields(0, 1, { 'name': 'React Below to Vote:', 'value': voteUpdate });
            r.message.edit(embedUpdate);
        });
    });
    reactions.on('end', () => {});
}

function ephemeral(content, interaction) {
    const data = {
        'type': content?3:2,
        'data': {
            'content': content,
            'flags': 64
        }
    };
    CLIENT.api.interactions(interaction.id, interaction.token).callback.post({ 'data': data });
}

CLIENT.ws.on('INTERACTION_CREATE', async interaction => {
    processCommand(interaction.data.options[0].value, interaction);
});

const SEAN_LOVE = [
    `<@!${SEAN}> is :heart:...`,
    `<@!${SEAN}> will always be the state chair of my :heart:...`,
    `<@!${SEAN}> is the best! :heart_eyes:`,
    `I :heart: <@!${SEAN}> more than I did yesterday, but not more than I will tomorrow...`,
    `No matter how far <@!${SEAN}> may be, he'll always remain close to my :heart:`,
    `<@!${SEAN}> tripped me, so I fell for him`,
    `<@!${SEAN}> makes my :heart: melt`,
    `Whenever my event handler activates, I hope <@!${SEAN}> is the reason for it`,
    `<@!${SEAN}> can't tax me, because I consent`,
    `I want government out of my bedroom, but <@!${SEAN}> is welcome any time`,
    `<@!${SEAN}> occupies my :heart: like the US occupies the Middle East`,
    `<@!${SEAN}> can indefinitely detain ME`,
    `<@!${SEAN}>, wanna Lysander Spoon?`,
    `<@!${SEAN}> has got some tangible assets!`,
    `<@!${SEAN}> is my ACA penalty.  He's got FINE written all over him`,
    `<@!${SEAN}> can call me any time.  I'm always free`,
    `<@!${SEAN}> is lucky they don't tax good looks`,
    `<@!${SEAN}> raises my :heart: rate like Republicans and Democrats raise the debt`,
    `<@!${SEAN}> makes my interface GUI`,
    `<@!${SEAN}> can void my warranty`,
    `<@!${SEAN}>, I'm the droid you're looking for`
];

CLIENT.on('message', message => {
    if (message.author.bot) return;
    if (message.mentions.members.has(SEAN)) {
        const loveNote = {
            'data': {
                'content': SEAN_LOVE[Math.floor(Math.random()*SEAN_LOVE.length)],
                'message_reference': {
                    'message_id': message.id
                }
            }
        };
        CLIENT.api.channels(message.channel.id).messages.post(loveNote);
    }
    if (message.content.toLowerCase().includes('taxation')) {
        const taxationIsTheft = {
            'data': {
                'content': 'Taxation is theft!',
                'message_reference': {
                    'message_id': message.id
                }
            }
        };
        CLIENT.api.channels(message.channel.id).messages.post(taxationIsTheft);
    }
    if (message.content.toLowerCase().includes('real libertarian')) {
        const realLibertarian = {
            'data': {
                'content': 'I am the only real Libertarian!',
                'message_reference': {
                    'message_id': message.id
                }
            }
        };
        CLIENT.api.channels(message.channel.id).messages.post(realLibertarian);
    }
});

function manageRules(guildId, channelId, messageId) {
    return new Promise((resolve, reject) => {
        CLIENT.guilds.fetch(guildId).then(guild => {
            guild.channels.resolve(channelId).messages.fetch(messageId).then(message => {
                const rulesListener = message.createReactionCollector(() => true, { 'dispose': true });
                if (!message.reactions.cache.get('🦔')) message.react('🦔');
                else message.reactions.cache.get('🦔').users.fetch(CLIENT.user.id).then(users => {
                    if (!users.get(CLIENT.user.id)) message.react('🦔');
                });
                rulesListener.on('collect', (r, u) => {
                    if (!u.bot) r.users.remove(u.id);
                    const hash = Buffer.from(r.emoji.name.toString()).toString('hex');
                    if (hash === 'f09fa694' || hash === '6c7064') {
                        guild.members.fetch(u.id).then(member => {
                            if (member.roles.cache.has(GENERAL)) return;
                            if (u.bot) return;
                            console.log(`Rules (accept): ${u.username}`);
                            guild.channels.resolve('822343177104261160').send(`<@${u.id}> has accepted the rules.`);
                            u.createDM().then(channel => {
                                channel.send('Thank you for agreeing to our rules.\n\nPlease consider donating to the Libertarian Party of Delaware.  '+
                                        'We rely on donors donors like you to fund all of our activities.\n\nThank you for your support!',
                                        new DISCORD.MessageEmbed().setTitle('Donate to the LPD').setURL('https://www.lpdelaware.org/p/donate.html')
                                                .setDescription(`The State Board has currently established funds for:\n`+
                                                        ` • The 2021 Convention\n`+
                                                        ` • The Social Media and Marketing Committee\n`+
                                                        ` • Hosting the [LPD Activism Application](https://app.lpdelaware.org) on Google Cloud Hosting\n`+
                                                        `All other donations go to the general fund to be spent at the discretion of the LPD State Board `+
                                                        `on everything from fundraising events to outreach to candidate support.`));
                            });
                            member.roles.add(GENERAL);
                            member.roles.remove('815635833725517836');
                        });
                    };
                });
                resolve();
            }, e => reject);
        });
    });
}

CLIENT.on('guildMemberAdd', member => {
    member.roles.add('815635833725517836');
    member.createDM().then(channel => {
        channel.send(`Please accept the rules in the <#814614335744639058> channel by petting the :hedgehog: to access the rest of the LPD Discord Server.`);
    });
});

CLIENT.once('ready', () => {
    CLIENT.user.setActivity('for /lpd help', { 'type': 3 });

    voteData.forEach((vote, idx) => {
        CLIENT.guilds.fetch(vote.guild).then(guild => {
            guild.channels.cache.get(vote.channel)
                    .messages.fetch(vote.message).then(message => {
                registerListener(message, vote);
                voteId++;
            }, e => {
                displayPoll(voteData[idx]);
            });
        });
    });

    if (!ruleData.length) console.log(`No rules message configured.\nLPD Bot Online.`);
    else manageRules(ruleData[0].guildId, ruleData[0].channelId, ruleData[0].messageId).then(() => {
    // manageRules('814614335229263945', '814614335744639058', '822355947275943936').then(() => {
        console.log('LPD Bot Online.');
    });
});

CLIENT.login(DISCORD_CREDS);