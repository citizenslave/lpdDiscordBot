'use strict';

import DISCORD from 'discord.js';
import CRYPTO from 'crypto';

import FilePersistenceEngine from '../../utils/FilePersistenceEngine.js';

import BaseCommand from '../baseCommand.js';

import DISCORD_UTILS from '../../utils/discord-utils.js';

import PERMS from '../../constants/permissions.js';
import ROLES from '../../constants/roles.js';
import CHANS from '../../constants/channels.js';

const BOT_ROLES = [
    ROLES.LPD_BOT,
    ROLES.STATE_CHAIR
];

let voteId = 0;
const VOTE_PERSISTANCE = new FilePersistenceEngine('./data/storage/ballotData');
const SELECTIONS = [ '🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵', '🇶', '🇷', '🇸', '🇹', '🇺', '🇻', '🇼', '🇽', '🇾', '🇿' ];
const INSTRUCTIONS = [ `:grey_question: - Show current votes`,
        `<:whip:830972517598494740> - Whip outstanding votes`,
        `:arrows_counterclockwise: - Move poll to bottom`,
        `:x: - Delete poll (DON'T)` ].join('\n');

export default class BallotCommand extends BaseCommand {
    static voteData = VOTE_PERSISTANCE.readFile().filter(v => !v.question);

    static generateEmbed(position, candidates, isSecret, isApproval, doneDate, url) {
        const type = [];
        if (!isSecret) type.push('NOT SECRET');
        if (isApproval) type.push('APPROVAL');

        const candidateFields = [{ 'name': 'Candidates:', 'value': candidates, 'inline': !isSecret }];
        if (!isSecret) candidateFields.push({ 'name': 'Votes:', 'value': new Array(candidates.split('\n').length).fill(0).join('\n'), 'inline': true });
        return new DISCORD.MessageEmbed()
                .setTitle(`Vote for ${position}:${type.length?`\n*(${type.join('/')})*`:''}`)
                .setDescription(this.getDescriptionText(url, doneDate))
                .addFields(candidateFields)
                .addField('Instructions:', (isApproval?'🚫 - Clears all votes, selects NOTA.\n':'')+INSTRUCTIONS);
    }

    static getDescriptionText(url, doneDate) {
        const dateText = [ `Closes ${doneDate.toLocaleDateString()}`,
                `${doneDate.toLocaleTimeString(undefined, { 'timeZoneName': 'short' })}` ].join(' @ ');
        
        return (url?`${url.trim().substr(4)}\n`:``)+dateText;
    }

    static getChannelVoterRoles(channel, roles) {
        return roles.filter(r => {
            if (!BOT_ROLES.includes(r.id) && (channel.parent.id !== CHANS.EXEC_SESSION_CAT || r.id === ROLES.STATE_BOARD)) {
                const bitfield = BigInt(channel.permissionsFor(r.id).bitfield);
                return ((bitfield & PERMS.REQD_VOTE_PERMS) === PERMS.REQD_VOTE_PERMS);
            } else return false;
        });
    }

    execute(params) {
        if (params[14]) return this.listPolls(params[14]);
        if (params[15]) return this.cancelPoll(params[15]);

        if (params[10] !== 'false' && params[12] === 'true') return this.ephemeral(`<@!816085452091424799> does not currently support secret approval voting.`)

        const initDate = this.getInitDate(params);
        if (isNaN(initDate)) return;
        const doneDate = new Date(initDate.getTime()+(48*60*60*1000));
        
        const candidateParts = params[13].split('/');
        const position = candidateParts.shift();
        const candidates = candidateParts.map((c, idx) => `${SELECTIONS[idx]} - ${c}`).join('\n')+`\n📝 - Write In\n🚫 - None of the Above`;
        if (candidateParts.length > 16) return ephemeral(`<@!816085452091424799> only supports up to 16 options.`);

        const embed = BallotCommand.generateEmbed(position, candidates, params[10] !== 'false', params[12] === 'true', doneDate, params[6]);

        const filteredRoles = BallotCommand.getChannelVoterRoles(this.channel, this.roles);
        if (!filteredRoles.filter(role => this.roles.has(role))) return this.ephemeral('No permission in this channel.');
        const roleMentions = filteredRoles.map(role => `<@&${role.id}>`).join(', ');

        this.ack();
        this.guild.members.fetch().then(members => {
            const eligibleRoles = new DISCORD.Collection(filteredRoles.map(r => [r.id, null]));
            const eligibleIds = members.filter(i => i.roles.cache.intersect(eligibleRoles).size).map(i => i.id);
            embed.setDescription(embed.description+`\n(0/${eligibleIds.length}) eligible votes.`);

            const voteDetails = {
                'voteId': voteId++,
                'position': `${params[6] || ''} ${position}`.trim(),
                'candidates': candidateParts,
                'secret': params[10] !== 'false',
                'approval': params[12] === 'true',
                'initDate': initDate,
                'doneDate': doneDate,
                'roles': filteredRoles.map(r => r.id),
                'guild': this.guild.id,
                'channel': this.channel.id,
                'message': '-1',
                'votes': [],
                'voters': []
            };
            BallotCommand.voteData.push(voteDetails);

            if (new Date(voteDetails.initDate) <= new Date()) {
                this.complete();
                this.channel.send(`Ballot for ${roleMentions}`, embed).then(message => {
                    this.supportBallot(message, voteDetails);
                });
            } else {
                VOTE_PERSISTANCE.writeFile(BallotCommand.voteData);
                this.complete(`Ballot ${voteId-1} scheduled for ${initDate.toLocaleString()}`);
            }
        });
    }

    listPolls(polls) {
        if (polls === '*') {
            if (BallotCommand.voteData.filter(v => v.message === '-1' && !v.question).length === 0) return this.ephemeral('No scheduled polls.');
            const pollList = BallotCommand.voteData.filter(v => v.message === '-1')
                    .map(v => `${v.voteId} - ${v.position.replace(/url:(\[.+\])\(.+\) +(.+)/, '$2 $1')}: ${new Date(v.initDate).toLocaleString()}`)
                    .join('\n');
            return this.ephemeral(pollList);
        } else if (!isNaN(polls)) {
            const pollData = BallotCommand.voteData.find(v => v.message === '-1' && !v.question && v.voteId === Number(polls));
            if (!pollData) return this.ephemeral(`Poll ${polls} not found.`);
            const pollMsg = `${pollData.voteId} - ${pollData.position.replace(/url:(\[.+\])\(.+\) +(.+)/, '$2 $1')}: `+
                    `${new Date(pollData.initDate).toLocaleString()}\n<#${pollData.channel}> ${pollData.roles.map(r => `<@&${r}>`)}`
            return this.ephemeral(pollMsg);
        } else return this.ephemeral(`Invalid poll id: ${polls}`);
    }

    cancelPoll(poll) {
        if (!isNaN(poll)) {
            const pollIndex = BallotCommand.voteData.findIndex(v => v.voteId === Number(poll) && v.message === '-1');
            if (pollIndex === -1) return this.ephemeral(`Poll ${poll} not found.`);
            BallotCommand.voteData.splice(pollIndex, 1);
            VOTE_PERSISTANCE.writeFile(BallotCommand.voteData);
            return this.ephemeral(`Poll ${poll} deleted.`);
        } else return this.ephemeral(`Invalid poll id: ${poll}`);
    }

    getInitDate(params) {
        if (params[0].includes('init:') && !params[1]) return this.ephemeral(`Unrecognized date parameter: ${params[0]}`);
        if (!params[1]) return new Date();
        
        if (params[2]) {
            if (isNaN(new Date(params[2]))) return this.ephemeral(`Unrecognized date: ${params[2]}`);
            params[2] = new Date(params[2]);
            if (params[2].getFullYear() < new Date().getFullYear()) params[2].setFullYear(new Date().getFullYear());
        } else params[2] = new Date();
        if (params[5] && params[5] === 'p') params[3] = (Number(params[3])+12).toString();
        if (params[5] && params[5] === 'a' && params[3] === '12') params[3] = '00';
        params[1] = new Date(`${params[2].toDateString()} ${params[3]}:${params[4] || '00'}`);
        if (params[1] < new Date()) params[1].setDate(params[1].getDate()+1);
        if (params[1] < new Date()) return ephemeral(`Date has passed: ${params[1].toLocaleString()}`);

        return new Date(params[1]);
    }

    registerListener(message, voteDetails) {
        const guild = this.client.guilds.cache.get(voteDetails.guild);
        const channel = guild.channels.cache.get(voteDetails.channel);

        guild.members.fetch().then(members => {
            message.createReactionCollector(() => true, {}).on('collect', (r, u) => {
                if (u.bot) return;
                r.users.remove(u).catch();

                const voteHash = Buffer.from(r.emoji.toString()).toString('hex');
                const votes = {
                    'f09f87a6': 0, 'f09f87a7': 0, 'f09f87a8': 0, 'f09f87a9': 0,
                    'f09f87aa': 0, 'f09f87ab': 0, 'f09f87ac': 0, 'f09f87ad': 0,
                    'f09f87ae': 0, 'f09f87af': 0, 'f09f87b0': 0, 'f09f87b1': 0,
                    'f09f87b2': 0, 'f09f87b3': 0, 'f09f87b4': 0, 'f09f87b5': 0,
                    'f09f939d': 0, 'f09f9aab': 0
                };

                const eligibleRoles = new DISCORD.Collection(voteDetails.roles.map(r => [r, null]));
                const eligibleIds = members.filter(i => i.roles.cache.intersect(eligibleRoles).size).map(i => i.id);
                if (!eligibleIds.includes(u.id) && voteHash !== 'e29d94') return;

                const now = new Date();
                const closingDate = new Date(voteDetails.doneDate);

                if ((voteHash === 'e29d8c' && (members.get(u.id).roles.cache.has(ROLES.STATE_CHAIR) || u.id === guild.ownerID)) || now > closingDate) {
                    voteDetails.votes.forEach(vote => vote.candidate?votes[vote.voteHash]++:0);

                    const totalVotes = voteDetails.votes.filter(v => v.candidate).length;
                    const validVotes = Object.keys(votes).filter((v, idx) => voteDetails.candidates[idx]);

                    const writeInArray = voteDetails.votes.filter(v => v.voteHash === 'f09f939d').map(v => v.candidate);
                    const writeInTally = {};
                    writeInArray.forEach(v => {
                        if (!writeInTally[v]) writeInTally[v] = 1;
                        else writeInTally[v]++;
                    });

                    const writeInResult = Object.keys(writeInTally).map(c => `  ${c} - ${writeInTally[c]}`).join('\n');
                    const writeInPercent = Object.keys(writeInTally).map(c => `  (${((writeInTally[c]/totalVotes)*100).toFixed(2)}%)`).join('\n');

                    const tallies = validVotes.map((v, idx) => `${voteDetails.candidates[idx]} - ${votes[v]}`).join('\n')
                            + `\nNone of the Above - ${votes['f09f9aab']}`
                            + `\n__**Write In - ${votes['f09f939d']}${votes['f09f939d']?':':''}**__\n${writeInResult}`;

                    const percentages = validVotes.map(v => `(${((votes[v]/totalVotes)*100).toFixed(2)}%)`).join('\n')
                            + `\n(${((votes['f09f9aab']/totalVotes)*100).toFixed(2)}%)`
                            + `\n(${((votes['f09f939d']/totalVotes)*100).toFixed(2)}%)`
                            + `\n${writeInPercent}`;

                    const voteInfo = voteDetails.secret?null:voteDetails.votes.filter(v => v.candidate)
                            .map(v => `${members.get(v.user).nickname || members.get(v.user).user.username} - ${v.candidate}`).join('\n');

                    const findUrl = voteDetails.position.match(/(url:\[.+\]\(.+\)) (.+)/) || [, , voteDetails.position];
                    const results = new DISCORD.MessageEmbed()
                            .setTitle(`Balloting for ${findUrl[2]} complete.`)
                            .setDescription((findUrl[1]?`${findUrl[1].substr(4)}\n`:``)+`Total Votes: ${totalVotes}\n`)
                            .addField('Tally:', tallies, true).addField('Percentage:', percentages, true);
                    if (!voteDetails.secret) results.addField('Votes:', voteInfo || 'No votes received.');

                    BallotCommand.voteData.splice(BallotCommand.voteData.findIndex(v => v.voteId === voteDetails.voteId), 1);
                    VOTE_PERSISTANCE.writeFile(BallotCommand.voteData);

                    r.message.delete({ 'timeout': 1000 }).catch(console.log);
                    channel.send(results).catch(console.log);
                } else if (voteHash === '3c3a776869703a3833303937323531373539383439343734303e') {
                    const awaitingMsg = eligibleIds.filter(u => !voteDetails.voters.includes(u))
                            .map(u => `<@!${u}>`).join(', ') + ', your votes are pending.';
                    DISCORD_UTILS.replyToMessage(this.client, r.message.id, { 'content': awaitingMsg }, voteDetails.channel).then(msg => {
                        channel.messages.fetch(msg.id).then(m => m.delete({ 'timeout': 20000 }));
                    });
                } else if (voteHash === 'e29d94') {
                    const awaitingMsg = eligibleIds.filter(u => !voteDetails.voters.includes(u))
                            .map(u => `${members.get(u).nickname || members.get(u).user.username}`).join('\n');
                    const voteInfo = voteDetails.secret?null:voteDetails.votes.filter(v => v.candidate)
                            .map(v => `${members.get(v.user).nickname || members.get(v.user).user.username} - ${v.candidate}`).join('\n');
                    const awaitingEmbed = new DISCORD.MessageEmbed()
                            .setTitle(`Balloting for ${voteDetails.position}:`)
                            .addField('Awaiting Votes from:', awaitingMsg || 'none');
                    if (!voteDetails.secret) awaitingEmbed.addField('Votes:',  voteInfo || 'No votes received.');
                    if (!eligibleIds.includes(u.id)) u.createDM().then(channel => {
                        channel.send(awaitingEmbed);
                    });
                    else DISCORD_UTILS.replyToMessage(this.client, r.message.id, { 'embed': awaitingEmbed }, voteDetails.channel).then(msg => {
                        channel.messages.fetch(msg.id).then(m => m.delete({ 'timeout': 20000 }));
                    });
                } else if (voteHash === 'f09f9484') {
                    channel.messages.fetch({ 'limit': 1}).then(m => {
                        if (!m.has(voteDetails.message))
                            this.displayBallot(voteDetails);
                    });
                } else {
                    let removeFlag = false;
                    if (voteDetails.voters.includes(u.id) && voteDetails.secret && !voteDetails.approval) return;
                    if (voteDetails.voters.includes(u.id) && !voteDetails.secret && !voteDetails.approval) {
                        voteDetails.voters.splice(voteDetails.voters.findIndex(v => v === u.id), 1);
                        voteDetails.votes.splice(voteDetails.votes.findIndex(v => v.user === u.id), 1);
                    }
                    if (!voteDetails.secret && voteDetails.approval) {
                        if (voteHash === 'f09f9aab') {
                            voteDetails.votes = voteDetails.votes.filter(v => v.user !== u.id);
                            voteDetails.voters = voteDetails.voters.filter(v => v !== u.id);
                        }
                        if (voteHash !== 'f09f939d') {
                            const voterSelections = voteDetails.votes.filter(v => v.user === u.id);
                            const removeVote = voteDetails.votes.findIndex(v => v.user === u.id && v.voteHash === voteHash);
                            if (removeVote >= 0) {
                                removeFlag = true;
                                voteDetails.votes.splice(removeVote, 1);
                                if (voterSelections.length === 1) voteDetails.voters = voteDetails.voters.filter(v => v !== u.id);
                            }
                        }
                        if (voteHash !== 'f09f9aab') {
                            voteDetails.votes = voteDetails.votes.filter(v => v.user === u.id && v.voteHash !== 'f09f9aab');
                        }
                    }
                    if (!removeFlag && (!voteDetails.approval || !voteDetails.voters.includes(u.id))) voteDetails.voters.push(u.id);

                    const embedUpdate = new DISCORD.MessageEmbed(message.embeds[0]);
                    const vote = { 'voteHash': voteHash };
                    vote['candidate'] = voteDetails.candidates.filter((c, idx) => Object.keys(votes)[idx] === voteHash)[0];
                    if (!voteDetails.secret) vote['user'] = u.id;

                    if (voteHash === 'f09f939d') {
                        vote['key'] = voteDetails.voteId+':'+CRYPTO.randomBytes(4).toString('hex');
                        u.createDM().then(channel => {
                            channel.send(`You have selected the "Write In" option on the ballot for ${voteDetails.position}.  You `+
                                    `have been assigned a vote key of **WIV${vote['key']}**.\n\nPlease reply with your selection `+
                                    `using the following syntax to ensure your vote is tabulated correctly:\n\`WIV${vote['key']}: Jamie Doe\``);
                        });
                    } else if (voteHash === 'f09f9aab') {
                        vote['candidate'] = 'None of the Above';
                    }
                    if (!removeFlag) voteDetails.votes.push(vote);

                    if (!voteDetails.secret) {
                        voteDetails.votes.forEach(vote => vote.candidate?votes[vote.voteHash]++:0);
                        const currentTally = [
                            voteDetails.candidates.map((c, idx) => Object.values(votes)[idx]).join('\n'),
                            [ votes['f09f939d'], votes['f09f9aab'] ].join('\n')
                        ].join('\n');
                        embedUpdate.spliceFields(1, 1, { 'name': 'Votes:', 'value': currentTally, 'inline': true })
                    }

                    VOTE_PERSISTANCE.writeFile(BallotCommand.voteData);
                    const description = embedUpdate.description.split('\n');
                    description[description.length-1] = `${voteDetails.voters.length}/${eligibleIds.length} eligible votes.`
                    embedUpdate.setDescription(description.join('\n'));
                    r.message.edit(embedUpdate).catch(console.log);
                }
            });
        });
    }

    displayBallot(voteDetails) {
        this.client.guilds.fetch(voteDetails.guild).then(guild => {
            const channel = guild.channels.cache.get(voteDetails.channel);
            if (channel.lastMessageID === voteDetails.message) return;

            channel.messages.fetch(voteDetails.message).then(message => {
                if (channel.lastMessageID === message.id) return;
                const embed = new DISCORD.MessageEmbed(message.embeds[0]);

                message.delete();
                channel.send(message.content, embed).then(freshMsg => {
                    this.supportBallot(freshMsg, voteDetails);
                });
            }, e => {
                this.guild.members.fetch().then(members => {
                    const roleMentions = 'Ballot for '+voteDetails.roles.map(r => `<@&${r}>`).join(', ');
                    const candidates = voteDetails.candidates.map((candidate, idx) => `${SELECTIONS[idx]} - ${candidate}`).join('\n')
                            +`\n📝 - Write In\n🚫 - None of the Above`;;

                    const eligibleRoles = new DISCORD.Collection(voteDetails.roles.map(r => [r, null]));
                    const eligibleIds = members.filter(i => i.roles.cache.intersect(eligibleRoles).size).map(i => i.id);

                    const findUrl = voteDetails.position.match(/(url:\[.+\]\(.+\)) (.+)/) || [, , voteDetails.position];
                    const embed = BallotCommand.generateEmbed(findUrl[2],
                            candidates,
                            voteDetails.secret,
                            voteDetails.approval,
                            new Date(voteDetails.doneDate),
                            findUrl[1]);
                    embed.setDescription(embed.description+`\n(${voteDetails.votes.filter(v => v.candidate).length}/${eligibleIds.length}) eligible votes.`);
                    
                    channel.send(roleMentions, embed).then(freshMsg => {
                        this.supportBallot(freshMsg, voteDetails);
                    });
                });
            });
        });
    }

    supportBallot(freshMsg, voteDetails) {
        voteDetails.message = freshMsg.id;
        VOTE_PERSISTANCE.writeFile(BallotCommand.voteData);

        for (let idx=0; idx<voteDetails.candidates.length; idx++) freshMsg.react(SELECTIONS[idx]);
        freshMsg.react('📝');
        freshMsg.react('🚫');
        freshMsg.react('❔');
        freshMsg.react(':whip:830972517598494740');
        freshMsg.react('🔄');
        freshMsg.react('❌');
                    
        freshMsg.pin().then(pinMsg => {
            pinMsg.channel.messages.fetch().then(msgs => {
                msgs.find(m => m.system).delete();
    
                this.registerListener(freshMsg, voteDetails);
            });
        });
    }

    static reloadBallots(client) {
        this.voteData.filter(v => !v.question).forEach(vote => {
            if (vote.voteId > voteId) voteId = vote.voteId+1;
            client.guilds.fetch(vote.guild).then(guild => {
                guild.channels.cache.get(vote.channel)
                        .messages.fetch(vote.message).then(message => {
                    this.generateCommand(vote, client).registerListener(message, vote);
                    voteId++;
                }).catch(e => {
                    this.generateCommand(vote, client).displayBallot(vote)
                    voteId++;
                });
            });
        });
    }

    static runSchedule(client) {
        return (ballotData) => {
            this.generateCommand(ballotData, client).displayBallot(ballotData);
        }
    }

    static generateCommand(ballotData, client) {
        const fakeInteraction = {
            'data': {
                'options': [{
                    'value': 'ballot'
                }]
            },
            'guild_id': ballotData.guild,
            'channel_id': ballotData.channel
        };

        return new BallotCommand(fakeInteraction, client);
    }

    static generateWriteInHandler(client) {
        return {
            'handleMessage': (message) => {
                const voteMsg = message.content.match(/WIV((\d+):.+): (.+)/);
                if (voteMsg) {
                    const vote = BallotCommand.voteData.filter(v => v.voteId.toString() === voteMsg[2])[0];
                    if (vote) {
                        if (vote.votes.find(v => v.user === message.author.id && v.candidate === voteMsg[3]))
                            return (`You have already submitted a write in vote for ${voteMsg[3]}.  You `+
                                    `cannot submit two for the same candidate.`);
                        if (vote.candidates.includes(voteMsg[3]))
                            return (`You are trying to submit a write in vote for a listed candidate.  Please `+
                                    `vote using the reaction for that candidate.`)
                        const wiv = vote.votes.filter(v => v.key === voteMsg[1])[0];
                        if (wiv) {
                            delete wiv.key;
                            wiv.candidate = voteMsg[3];
                            VOTE_PERSISTANCE.writeFile(BallotCommand.voteData);
                            client.channels.fetch(vote.channel).then(channel => {
                                channel.messages.fetch(vote.message).then(ballotMessage => {
                                    const embedUpdate = new DISCORD.MessageEmbed(ballotMessage.embeds[0]);
                                    const desc = embedUpdate.description.split('\n');
                                    const tally = desc[desc.length-1].match(/^(\d+)\/(.+)$/);
                                    if (vote.votes.filter(v => v.user === message.author.id).length === 1)
                                        desc[desc.length-1] = `${Number(tally[1])+1}/${tally[2]}`;
                                    embedUpdate.setDescription(desc.join('\n'));
                                    if (!vote.secret) {
                                        embedUpdate.fields[1].value = embedUpdate.fields[1].value.split('\n')
                                                .map((t, idx, v) => idx === (v.length-2)?Number(t)+1:t).join('\n');
                                    }
                                    ballotMessage.edit(embedUpdate);
                                });
                            });
                            return (`Your vote has been recorded.`+(vote.secret?`  No data has been saved linking `+
                                    `your user information to your selection.`:``));
                        } else return (`You sent me a vote, but I could not match the write in key.`);
                    } else return (`You sent me a vote, but I couldn't find the ballot.`);
                }
            }
        }
    }
}