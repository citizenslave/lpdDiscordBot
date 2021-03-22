'use strict';

import DISCORD from 'discord.js';

import FilePersistenceEngine from '../../utils/FilePersistenceEngine.js';

import BaseCommand from '../baseCommand.js';

import SeenCommand from './seen.js';
import DISCORD_UTILS from '../../utils/discord-utils.js';

const QUORUM_PERSISTENCE = new FilePersistenceEngine('./data/storage/quorumData');

export default class QuorumCommand extends BaseCommand {
    static connected = false;
    static quorumData = QUORUM_PERSISTENCE.readFile();

    execute(params) {
        this.ack();
        this.findQuorum(params);
    }

    findQuorum(params) {
        const currentCall = QuorumCommand.quorumData.find(d => {
            return d.guildId === this.guild.id && d.channelId === this.channel.id && d.roleId === params[1];
        });

        if (currentCall) {
            this.channel.messages.fetch(currentCall.messageId).then(m => {
                m.delete();
                DISCORD_UTILS.PresenceTracker.trackers = DISCORD_UTILS.PresenceTracker.trackers.filter(t => t.message !== currentCall.messageId);
            }).catch(console.log).finally(() => {
                this.createQuorum(params, currentCall);
            });
        } else {
            this.createQuorum(params);
        }
    }

    createQuorum(params, currentCall = null, presenceUser = null) {
        if (!params[2]) params[2] = 'react';
        return new Promise(resolve => {
            this.guild.members.fetch().then(members => {
                const roleMembers = members.filter(m => m.roles.cache.has(params[1]));
                const memberIds = roleMembers.filter(m => m.presence.status === 'online').map(m => m.user.id);
                const memberNames = roleMembers.map(m => m.nickname || m.user.username);
                const onlineValue = params[2] === 'react'?'Online':'Present';
                const initRespond = roleMembers.map(m => m.presence.status === 'online'?onlineValue:SeenCommand.lastSeen(m.user.id).toLocaleString());
                if (currentCall) initRespond.forEach((m, idx, a) => a[idx] = currentCall.responded.includes(roleMembers.array()[idx].user.id)?'Present':m);
                const initPresent = initRespond.filter(r => r === 'Present').length;
                const minimum = initRespond.length / 2;
                const embed = new DISCORD.MessageEmbed().setColor(initPresent > minimum?'GREEN':'#e5c601');
                const startTime = currentCall?new Date(currentCall.started):new Date();
                embed.addField('Member', memberNames.join('\n'), true);
                embed.addField('Presence', initRespond.join('\n'), true);
                embed.setDescription(`Started: ${startTime.toLocaleString()}`);
                if (params[2] === 'react') embed.addField('Instructions', '👍 to be marked present.');
                const content = `Quorum call for `;
                const contentData = `${initPresent <= minimum?`${((initPresent / initRespond.length)*100).toFixed(1)}%`:'complete'}`;
                this.channel.send({ 'content': content+(presenceUser?`<@${presenceUser}>: `:`<@&${params[1]}>: `)+contentData, 'embed': embed }).then(message => {
                    message.edit(content+`<@&${params[1]}>: `+contentData, embed);
                    if (params[2] === 'react') message.react('👍');
                    const data = {
                        'guildId': this.guild.id,
                        'channelId': this.channel.id,
                        'messageId': message.id,
                        'roleId': params[1],
                        'started': startTime.toISOString(),
                        'responded': params[2] === 'react'?[]:memberIds,
                        'minimum': minimum,
                        'total': initRespond.length,
                        'complete': initPresent > minimum,
                        'type': params[2]
                    }
                    if (!data.complete) {
                        const oldId = currentCall?currentCall.messageId:null;
                        if (!currentCall) {
                            QuorumCommand.quorumData.push(data);
                            currentCall = data;
                        } else {
                            currentCall.messageId = message.id;
                        }
                        if (currentCall.type === 'react') QuorumCommand.registerManualTracker(this.client, currentCall);
                        if (currentCall.type === 'react') QuorumCommand.registerPresenceTracker(this, currentCall, oldId);
                        QUORUM_PERSISTENCE.writeFile(QuorumCommand.quorumData);
                        resolve(currentCall.messageId);
                    }
                });
            });
        });
    }

    static resetQuorumCall(client, quorumCall) {
        const fakeInteraction = {
            'data': {
                'options': [{
                    'value': `quorum <@&${quorumCall.roleId}>`
                }]
            },
            'guild_id': quorumCall.guildId,
            'channel_id': quorumCall.channelId
        };
        return new QuorumCommand(fakeInteraction, client);
    }

    static reloadManualTrackers(client) {
        this.quorumData.forEach(quorumCall => {
            if (quorumCall.type === 'react') {
                this.registerManualTracker(client, quorumCall).then(m => {
                    this.registerPresenceTracker(this.resetQuorumCall(client, quorumCall), quorumCall, m);
                });
            }
        });
    }

    static registerManualTracker(client, quorumCall) {
        return new Promise(resolve => {
            const cmd = this.resetQuorumCall(client, quorumCall);
            client.guilds.fetch(quorumCall.guildId).then(guild => {
                guild.members.fetch().then(members => {
                    const roleMembers = members.filter(m => m.roles.cache.has(quorumCall.roleId));
                    const channel = guild.channels.cache.get(quorumCall.channelId);
                    channel.messages.fetch(quorumCall.messageId).then(message => {
                        message.createReactionCollector(() => true).on('collect', this.reactor(guild, roleMembers, channel, message, quorumCall));
                        resolve(message.id);
                    }).catch(e => {
                        cmd.createQuorum([, quorumCall.roleId], quorumCall).then(m => {
                            resolve(m);
                        });
                    });
                });
            });
        });
    }

    static registerPresenceTracker(cmd, quorumCall, oldMessageId) {
        cmd.client.guilds.fetch(quorumCall.guildId).then(guild => {
            guild.members.fetch().then(members => {
                const roleMembers = members.filter(m => m.roles.cache.has(quorumCall.roleId));
                const channel = guild.channels.cache.get(quorumCall.channelId);
                const currentTracker = DISCORD_UTILS.PresenceTracker.trackers.find(t => t.message === oldMessageId);
                if (!currentTracker) {
                    DISCORD_UTILS.PresenceTracker.trackers.push({
                        'filter': (o, n) => ((o && o.status === 'online') || n.status === 'online') &&
                                roleMembers.has(n.userID) && !quorumCall.complete &&
                                !quorumCall.responded.includes(n.userID),
                        'message': quorumCall.messageId,
                        'action': (messageId, presenceUser) => {
                            return new Promise(resolve => {
                                channel.messages.fetch(messageId).then(m => m.delete().catch());
                                cmd.createQuorum([, quorumCall.roleId], quorumCall, presenceUser).then(m => {
                                    resolve(m);
                                });
                            });
                        }
                    });
                }
            });
        });
    }

    static reactor(guild, roleMembers, channel, message, quorumCall) {
        return (r, u) => {
            if (u.bot) return;
            if (!roleMembers.has(u.id)) return r.users.remove(u).catch();
            if (quorumCall.responded.includes(u.id)) return r.users.remove(u).catch();
            if (Buffer.from(r.emoji.toString()).toString('hex') !== 'f09f918d') return r.users.remove(u).catch();
            
            quorumCall.responded.push(u.id);
            const embed = new DISCORD.MessageEmbed();
            const presenceArray = roleMembers.map(m => m.presence.status === 'online'?'Online':SeenCommand.lastSeen(m.user.id).toLocaleString());
            embed.addField('Member', roleMembers.map(m => m.nickname || m.user.username).join('\n'), true);
            embed.addField('Presence', roleMembers.array().map((m, idx) => {
                return quorumCall.responded.includes(m.user.id)?'Present':presenceArray[idx];
            }).join('\n'), true);
            embed.setDescription(`Started: ${new Date(quorumCall.started).toLocaleString()}`);
            const presentCount = quorumCall.responded.length;
            const currentTracker = DISCORD_UTILS.PresenceTracker.trackers.find(t => t.message === message.id);
            
            message.delete();
            if (presentCount > quorumCall.minimum) {
                embed.setColor('GREEN');
                channel.send(`Quorum call for <@&${quorumCall.roleId}>: complete.`, embed);
                quorumCall.complete = true;
                this.quorumData = this.quorumData.filter(q => !q.complete);
                DISCORD_UTILS.PresenceTracker.trackers = DISCORD_UTILS.PresenceTracker.trackers.filter(t => t.message === quorumCall.messageId);
                QUORUM_PERSISTENCE.writeFile(this.quorumData);
            } else {
                embed.setColor('#ebc601');
                embed.addField('Instructions', '👍 to be marked present.');
                const percent = ((presentCount / quorumCall.total)*100).toFixed(1);
                channel.send(`Quorum call for <@&${quorumCall.roleId}>: ${percent}%`, embed).then(m => {
                    m.react('👍');
                    m.createReactionCollector(() => true).on('collect', this.reactor(guild, roleMembers, channel, m, quorumCall));
                    quorumCall.messageId = m.id;
                    if (currentTracker) currentTracker.message = m.id;
                    QUORUM_PERSISTENCE.writeFile(this.quorumData);
                });
            }
        }
    }

    static registerTracker(client) {
        if (this.connected) return console.log('Quorum tracker already registered.');
        if (!this.quorumData.length) QUORUM_PERSISTENCE.writeFile(this.quorumData);
        client.on('presenceUpdate', (o, n) => {
            if (n.status !== 'online') return;
            Promise.all(this.quorumData.filter(q => q.type === 'presence').map(quorumCall => {
                return new Promise(resolve => {
                    client.guilds.fetch(quorumCall.guildId).then(guild => {
                        guild.members.fetch().then(members => {
                            const roleMembers = members.filter(m => m.roles.cache.has(quorumCall.roleId));
                            if (!roleMembers.has(n.userID)) return;
                            if (quorumCall.responded.includes(n.userID)) return;
                            quorumCall.responded.push(n.userID);
                            const channel = guild.channels.cache.get(quorumCall.channelId);
                            channel.messages.fetch(quorumCall.messageId).then(message => {
                                const embed = new DISCORD.MessageEmbed();
                                const presenceArray = roleMembers.map(m => SeenCommand.lastSeen(m.user.id).toLocaleString());
                                embed.setDescription(`Started: ${new Date(quorumCall.started).toLocaleString()}`);
                                embed.addField('Member', roleMembers.map(m => m.nickname || m.user.username).join('\n'), true);
                                embed.addField('Presence', roleMembers.array().map((m, idx) => {
                                    return quorumCall.responded.includes(m.user.id)?'Present':presenceArray[idx];
                                }).join('\n'), true);
                                const presentCount = quorumCall.responded.length;
                                if (presentCount > quorumCall.minimum) {
                                    message.delete();
                                    embed.setColor('GREEN');
                                    channel.send(`Quorum call for <@&${quorumCall.roleId}>: complete.`, embed);
                                    quorumCall.complete = true;
                                } else {
                                    message.delete();
                                    embed.setColor('#e5c601');
                                    const percent = ((presentCount / quorumCall.total)*100).toFixed(1);
                                    channel.send(`Quorum call for <@&${quorumCall.roleId}>: ${percent}%`, embed).then(m => {
                                        quorumCall.messageId = m.id;
                                        QUORUM_PERSISTENCE.writeFile(this.quorumData);
                                    });
                                }
                                resolve();
                            });
                        });
                    });
                });
            })).then(() => {
                this.quorumData = this.quorumData.filter(q => !q.complete);
                QUORUM_PERSISTENCE.writeFile(this.quorumData);
            });
        });
    }
}