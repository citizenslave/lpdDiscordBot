'use strict';

import CRYPTO from 'crypto';
import DISCORD from 'discord.js';
import HTTPS from 'https';

import UTILS from './utils/utils.js';

import DISCORD_UTILS from './utils/discord-utils.js';
import COMMAND_MAPPER from './command-controller/commandMapper.js';

import BaseCommand from './command-controller/baseCommand.js';
import RulesCommand from './command-controller/commands/rules.js';

import CREDS from './constants/creds.js';
import ROLES from './constants/roles.js';
import CHANS from './constants/channels.js';
import PERMS from './constants/permissions.js';

import DONATION_EMBED from './constants/donations.js';

import FilePersistanceEngine from './utils/FilePersistenceEngine.js';
import SeenCommand from './command-controller/commands/seen.js';
import QuorumCommand from './command-controller/commands/quorum.js';
import PollCommand from './command-controller/commands/poll.js';
import BallotCommand from './command-controller/commands/ballot.js';

const VOTE_PERSISTANCE = new FilePersistanceEngine('./data/storage/ballotData');
const voteData = VOTE_PERSISTANCE.readFile();

const CLIENT = new DISCORD.Client();

const SEAN = '814892496139190322';
const WILL = '814614126298529843';

const BOT_ROLES = [ // Ignored by polls
    ROLES.LPD_BOT,        // LPD Bot
    ROLES.STATE_CHAIR     // State Chair
];

const selections = [ '🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵', '🇶', '🇷', '🇸', '🇹', '🇺', '🇻', '🇼', '🇽', '🇾', '🇿' ];
const instructions = `:grey_question: - Show current votes\n<:whip:830972517598494740> - Whip outstanding votes\n:arrows_counterclockwise: - Move poll to bottom\n:x: - Delete poll (DON'T)`;
let voteId = 0;

const SEAN_LOVE = [
    `<@!${SEAN}> is :heart:...`,
    `<@!${SEAN}> will always be the state chair of my :heart:...`,
    `<@!${SEAN}> is the best! :heart_eyes:`,
    `I :heart: <@!${SEAN}> more than I did yesterday, but not more than I will tomorrow...`,
    `No matter how far <@!${SEAN}> may be, he'll always remain close to my :heart:...`,
    `<@!${SEAN}> tripped me, so I fell for him...`,
    `<@!${SEAN}> makes my :heart: melt!`,
    `Whenever my event handler activates, I hope <@!${SEAN}> is the reason for it.`,
    `<@!${SEAN}> can't tax me, because I consent.`,
    `I want government out of my bedroom, but <@!${SEAN}> is welcome any time.`,
    `<@!${SEAN}> occupies my :heart: like the US occupies the Middle East...`,
    `<@!${SEAN}> can indefinitely detain ME!`,
    `<@!${SEAN}>, wanna Lysander Spoon?`,
    `<@!${SEAN}> has got some tangible assets!`,
    `<@!${SEAN}> is my ACA penalty.  He's got FINE written all over him!`,
    `<@!${SEAN}> can call me any time.  I'm always free.`,
    `<@!${SEAN}> is lucky they don't tax good looks.`,
    `<@!${SEAN}> raises my :heart: rate like Republicans and Democrats raise the debt.`,
    `<@!${SEAN}> makes my interface GUI!`,
    `<@!${SEAN}> can void my warranty!`,
    `<@!${SEAN}>, I'm the droid you're looking for!`,
    `<@!${SEAN}> can whip my nae nae!`,
    `<@!${SEAN}> has a pet name for me...it's Leg-Hump-A-Tron 3000 :heart_eyes:`
];

function processCommand(command, fullCommand) {
    console.log(command);

    const guild = CLIENT.guilds.cache.get(fullCommand.guild_id);
    const channel = guild.channels.cache.get(fullCommand.channel_id);
    const rolesCache = guild.roles.cache;

    const args = command.split(/ +/);
    const cmd = args.shift().toLowerCase();
    const content = command.slice(cmd.length+1);

    switch (cmd) {
        case 'ballota':
            if (!content) return ephemeral('No question provided.', fullCommand);
            const ballotScheduleArg = content.match(/^(list|cancel):(\d+|\*)$/);
            if (ballotScheduleArg) {
                if (ballotScheduleArg[1] === 'list') {
                    if (ballotScheduleArg[2] === '*') {
                        if (voteData.filter(v => v.message === '-1' && !v.question).length === 0) return ephemeral('No scheduled polls.', fullCommand);
                        const pollList = voteData.filter(v => v.message === '-1')
                                .map(v => `${v.voteId} - ${v.position.replace(/url:(\[.+\])\(.+\) +(.+)/, '$2 $1')}: ${new Date(v.ballotInitDate).toLocaleString()}`)
                                .join('\n');
                        return ephemeral(pollList, fullCommand);
                    } else if (!isNaN(ballotScheduleArg[2])) {
                        const pollData = voteData.find(v => v.message === '-1' && !v.question && v.voteId === Number(ballotScheduleArg[2]));
                        if (!pollData) return ephemeral(`Poll ${ballotScheduleArg[2]} not found.`, fullCommand);
                        const pollMsg = `${pollData.voteId} - ${pollData.position.replace(/url:(\[.+\])\(.+\) +(.+)/, '$2 $1')}: `+
                                `${new Date(pollData.ballotInitDate).toLocaleString()}\n<#${pollData.channel}> ${pollData.roles.map(r => `<@&${r}>`)}`
                        return ephemeral(pollMsg, fullCommand);
                    } else return ephemeral(`Invalid poll id: ${ballotScheduleArg[2]}`, fullCommand);
                } else if (ballotScheduleArg[1] === 'cancel') {
                    if (!isNaN(ballotScheduleArg[2])) {
                        const pollIndex = voteData.findIndex(v => v.voteId === Number(ballotScheduleArg[2]) && v.message === '-1');
                        if (pollIndex === -1) return ephemeral(`Poll ${ballotScheduleArg[2]} not found.`, fullCommand);
                        voteData.splice(pollIndex, 1);
                        VOTE_PERSISTANCE.writeFile(voteData);
                        return ephemeral(`Poll ${ballotScheduleArg[2]} deleted.`, fullCommand);
                    } else return ephemeral(`Invalid poll id: ${ballotScheduleArg[2]}`, fullCommand);
                }
            }
            const ballotInitArg = content.match(/(.*)init:\((.+?)\)(.*)/);
            const secretCheck = ballotInitArg?`${ballotInitArg[1].trim()} ${ballotInitArg[3].trim()}`.trim():content;
            if (ballotInitArg) {
                const dateBits = ballotInitArg[2].match(/^((\d{1,4}[-\./]\d{1,2}([-\./]\d{1,4})?)?[T ])?((\d{1,2})([:\.]?(\d{0,2}))?)([ap]?)m?$/);
                if (dateBits) {
                    if (dateBits[1]) {
                        if (isNaN(new Date(dateBits[1]))) return ephemeral(`Unrecognized date: ${dateBits[1]}`, fullCommand);
                        dateBits[1] = new Date(dateBits[1]);
                        if (dateBits[1].getFullYear() < new Date().getFullYear()) dateBits[1].setFullYear(new Date().getFullYear());
                    } else dateBits[1] = new Date();
                    if (dateBits[8] && dateBits[8] === 'p') dateBits[5] = (Number(dateBits[5])+12).toString();
                    if (dateBits[8] && dateBits[8] === 'a' && dateBits[5] === '12') dateBits[5] = '00';
                    ballotInitArg[2] = new Date(`${dateBits[1].toDateString()} ${dateBits[5]}:${dateBits[7] || '00'}`);
                    if (ballotInitArg[2] < new Date()) ballotInitArg[2].setDate(ballotInitArg[2].getDate()+1);
                    if (ballotInitArg[2] < new Date()) return ephemeral(`Date has passed: ${ballotInitArg[2].toLocaleString()}`, fullCommand);
                }
            }
            const ballotInitDate = new Date(ballotInitArg?ballotInitArg[2]:new Date());
            const ballotDoneDate = new Date(ballotInitDate.getTime()+(48*60*60*1000));
            const secretArg = secretCheck.match(/(.*)secret:(true|false)(.*)/);
            const ballotQuestion = secretArg?`${secretArg[1].trim()} ${secretArg[3].trim()}`:secretCheck;
            const isSecret = secretArg?secretArg[2] !== 'false':true;
            const ballotArgs = ballotQuestion.split('/').map(i => i.trim());
            const position = ballotArgs.shift();
            if (ballotArgs.length > 10) return ephemeral(`<@!816085452091424799> only supports 10 options at this time.`, fullCommand);
            const ballotRoles = [];
            guild.members.fetch().then(members => {
                const ballotEmbed = new DISCORD.MessageEmbed().setTitle(`Vote for ${position}:${!isSecret?' *(NOT SECRET)*':''}`);
                const candidates = ballotArgs.map((candidate, idx) => {
                    return `${selections[idx]} - ${candidate}`
                }).join('\n');
                ballotEmbed.addField('Candidates:', candidates+'\n📝 - Write In\n🚫 - None of the Above', !isSecret);
                if (!isSecret) ballotEmbed.addField('Votes:', new Array(ballotArgs.length+2).fill('0').join('\n'), true);
                ballotEmbed.addField('Instructions:', instructions);
                guild.roles.fetch().then(roles => {
                    roles.cache.forEach(role => {
                        const bitfield = BigInt(channel.permissionsFor(role.id).bitfield);
                        if ((bitfield & PERMS.REQD_VOTE_PERMS) === PERMS.REQD_VOTE_PERMS)
                            ballotRoles.push(role);
                    });
                    const filteredBallotRoles = ballotRoles.filter(role => {
                        return !BOT_ROLES.includes(role.id) && (channel.parent.id !== CHANS.EXEC_SESSION_CAT || role.id === ROLES.STATE_BOARD);
                    });
                    const ballotRoleMentions = filteredBallotRoles.map(role => `<@&${role.id}>`).join(', ');
                    const eligibleRoles = new DISCORD.Collection(filteredBallotRoles.map(r => [r.id, null]));
                    const eligibleIds = members.filter(i => i.roles.cache.intersect(eligibleRoles).size).map(i => i.id);
                    ballotEmbed.setDescription(`0/${eligibleIds.length} eligible votes.`);
                    const voteDetails = {
                        'voteId': voteId++,
                        'position': position,
                        'candidates': ballotArgs,
                        'secret': isSecret,
                        'initDate': ballotInitDate,
                        'doneDate': ballotDoneDate,
                        'roles': filteredBallotRoles.map(r => r.id),
                        'guild': guild.id,
                        'channel': channel.id,
                        'message': '-1',
                        'votes': [],
                        'voters': []
                    };
                    voteData.push(voteDetails);
                    if (new Date(voteDetails.initDate) <= new Date()) {
                        channel.send(`Ballot for ${ballotRoleMentions}`, ballotEmbed).then(ballotMessage => {
                            voteDetails.message = ballotMessage.id;
                            VOTE_PERSISTANCE.writeFile(voteData);
                            ephemeral(null, fullCommand);
                            for (let idx=0; idx<ballotArgs.length; idx++) ballotMessage.react(selections[idx]);
                            ballotMessage.react('📝');
                            ballotMessage.react('🚫');
                            ballotMessage.react('❔');
                            ballotMessage.react(':whip:830972517598494740');
                            ballotMessage.react('🔄');
                            ballotMessage.react('❌');
                
                            ballotMessage.pin().then(pinMsg => {
                                pinMsg.channel.messages.fetch().then(msgs => {
                                    msgs.find(m => m.system).delete();
                        
                                    registerBallotListener(ballotMessage, voteDetails);
                                });
                            });
                        });
                    } else {
                        VOTE_PERSISTANCE.writeFile(voteData);
                        return ephemeral(`Ballot ${voteId-1} scheduled for ${ballotInitDate.toLocaleString()}`, fullCommand)
                    }
                });
            });
            break;
        default:
            BaseCommand.runCommand(fullCommand, CLIENT);
            break;
    }
}

function displayBallotPoll(voteDetails) {
    CLIENT.guilds.fetch(voteDetails.guild).then(guild => {
        const channel = guild.channels.cache.get(voteDetails.channel);
        if (channel.lastMessageID === voteDetails.message) return;
        channel.messages.fetch(voteDetails.message).then(message => {
            if (channel.lastMessageID === message.id) return;
            message.delete();
            const embed = new DISCORD.MessageEmbed(message.embeds[0]);
            channel.send(message.content, embed).then(freshMsg => {
                voteDetails.message = freshMsg.id;
                VOTE_PERSISTANCE.writeFile(voteData);
                for (let idx=0; idx<voteDetails.candidates.length; idx++) freshMsg.react(selections[idx]);
                freshMsg.react('📝');
                freshMsg.react('🚫');
                freshMsg.react('❔');
                freshMsg.react(':whip:830972517598494740');
                freshMsg.react('🔄');
                freshMsg.react('❌');
            
                freshMsg.pin().then(pinMsg => {
                    pinMsg.channel.messages.fetch().then(msgs => {
                        msgs.find(m => m.system).delete();
            
                        registerBallotListener(freshMsg, voteDetails);
                    });
                });
            });
        }, e => {
            const roleMentions = 'Ballot for '+voteDetails.roles.map(r => `<@&${r}>`).join(', ');
            const eligibleRoles = new DISCORD.Collection(voteDetails.roles.map(r => [r, null]));
            const candidates = voteDetails.candidates.map((candidate, idx) => `${selections[idx]} - ${candidate}`).join('\n');
            guild.members.fetch().then(members => {
                const eligibleIds = members.filter(i => i.roles.cache.intersect(eligibleRoles).size).map(i => i.id);
                const embed = new DISCORD.MessageEmbed().setTitle(`Vote for ${voteDetails.position}:${!voteDetails.secret?' *(NOT SECRET)*':''}`)
                        .setDescription(`${voteDetails.votes.filter(v => v.candidate).length}/${eligibleIds.length} eligible votes.`)
                        .addField('Candidates:', candidates+'\n📝 - Write In\n🚫 - None of the Above')
                        .addField('Instructions:', instructions);
                
                channel.send(roleMentions, embed).then(freshMsg => {
                    voteDetails.message = freshMsg.id;
                    VOTE_PERSISTANCE.writeFile(voteData);
                    for (let idx=0; idx<voteDetails.candidates.length; idx++) freshMsg.react(selections[idx]);
                    freshMsg.react('📝');
                    freshMsg.react('🚫');
                    freshMsg.react('❔');
                    freshMsg.react(':whip:830972517598494740');
                    freshMsg.react('🔄');
                    freshMsg.react('❌');
                
                    freshMsg.pin().then(pinMsg => {
                        pinMsg.channel.messages.fetch().then(msgs => {
                            msgs.find(m => m.system).delete();
                
                            registerBallotListener(freshMsg, voteDetails);
                        });
                    });
                });
            });
        });
    });
}

function registerBallotListener(message, voteDetails) {
    const reactions = message.createReactionCollector(() => true, {});
    const eligibleRoles = new DISCORD.Collection(voteDetails.roles.map(r => [r, null]));
    const guild = CLIENT.guilds.cache.get(voteDetails.guild);
    const channel = guild.channels.cache.get(voteDetails.channel);
    const embed = message.embeds[0];
    guild.members.fetch().then(members => {
        const eligibleIds = members.filter(i => i.roles.cache.intersect(eligibleRoles).size).map(i => i.id);

        reactions.on('collect', (r, u) => {
            if (u.bot) return;

            r.users.remove(u).catch();
            if (!eligibleIds.includes(u.id)) return;
            const member = members.get(u.id);
            const embedUpdate = new DISCORD.MessageEmbed(embed);
            const voteHash = Buffer.from(r.emoji.toString()).toString('hex');
            const votes = {
                'f09f87a6': 0, 'f09f87a7': 0, 'f09f87a8': 0, 'f09f87a9': 0, 'f09f87aa': 0,
                'f09f87ab': 0, 'f09f87ac': 0, 'f09f87ad': 0, 'f09f87ae': 0, 'f09f87af': 0,
                'f09f939d': 0, 'f09f9aab': 0
            };
            if (voteHash === 'e29d8c') {
                if (!member.roles.cache.has(ROLES.STATE_CHAIR) && !member.roles.cache.has(ROLES.ADMIN)) return;
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
                const percentages = validVotes.map((v, idx) => `(${((votes[v]/totalVotes)*100).toFixed(2)}%)`).join('\n')
                        + `\n(${((votes['f09f9aab']/totalVotes)*100).toFixed(2)}%)`
                        + `\n(${((votes['f09f939d']/totalVotes)*100).toFixed(2)}%)`
                        + `\n${writeInPercent}`;
                const voteInfo = voteDetails.secret?null:voteDetails.votes.filter(v => v.candidate)
                        .map(v => `${members.get(v.user).nickname || members.get(v.user).user.username} - ${v.candidate}`).join('\n');
                const results = new DISCORD.MessageEmbed().setTitle(`Balloting for ${voteDetails.position} complete.`).setDescription(`Total Votes: ${totalVotes}\n`)
                        .addField('Tally:', tallies, true).addField('Percentage:', percentages, true);
                if (!voteDetails.secret) results.addField('Votes:', voteInfo || 'No votes received.');
                voteData.splice(voteData.findIndex(v => v.voteId === voteDetails.voteId), 1);
                VOTE_PERSISTANCE.writeFile(voteData);
                r.message.delete({ 'timeout': 1000 }).catch(console.log);
                channel.send(results).catch(console.log);
            } else if (voteHash === '3c3a776869703a3833303937323531373539383439343734303e') {
                const awaitingMsg = eligibleIds.filter(u => !voteDetails.voters.includes(u))
                        .map(u => `<@!${u}>`).join(', ') + ', your votes are pending.';
                const awaitingEmbed = new DISCORD.MessageEmbed().setTitle(`Balloting for ${voteDetails.position}:`).addField('Awaiting Votes from:', awaitingMsg);
                const awaitingObj = {
                    'data': {
                        'content': awaitingMsg,
                        'message_reference': { 'message_id': r.message.id }
                    }
                };
                if (!eligibleIds.includes(u.id)) u.createDM().then(channel => {
                    channel.send(awaitingEmbed);
                });
                else CLIENT.api.channels(voteDetails.channel).messages.post(awaitingObj).then(msg => {
                    channel.messages.fetch(msg.id).then(m => m.delete({ 'timeout': 20000 }));
                });
            } else if (voteHash === 'e29d94') {
                const awaitingMsg = eligibleIds.filter(u => !voteDetails.voters.includes(u))
                        .map(u => `${members.get(u).nickname || members.get(u).user.username}`).join('\n');
                const voteInfo = voteDetails.secret?null:voteDetails.votes.filter(v => v.candidate)
                        .map(v => `${members.get(v.user).nickname || members.get(v.user).user.username} - ${v.candidate}`).join('\n');
                const awaitingEmbed = new DISCORD.MessageEmbed().setTitle(`Balloting for ${voteDetails.position}:`).addField('Awaiting Votes from:', awaitingMsg || 'none');
                if (!voteDetails.secret) awaitingEmbed.addField('Votes:',  voteInfo || 'No votes received.');
                const awaitingObj = {
                    'data': {
                        'embed': awaitingEmbed,
                        'message_reference': { 'message_id': r.message.id }
                    }
                }
                if (!eligibleIds.includes(u.id)) u.createDM().then(channel => {
                    channel.send(awaitingEmbed);
                });
                else CLIENT.api.channels(voteDetails.channel).messages.post(awaitingObj).then(msg => {
                    channel.messages.fetch(msg.id).then(m => m.delete({ 'timeout': 20000 }));
                });
            } else if (voteHash === 'f09f9484') {
                channel.messages.fetch({ 'limit': 1}).then(m => {
                    if (!m.has(voteDetails.message))
                        displayBallotPoll(voteDetails);
                });
            } else {
                if (voteDetails.voters.includes(u.id) && voteDetails.secret) return;
                if (voteDetails.voters.includes(u.id) && !voteDetails.secret) {
                    voteDetails.voters.splice(voteDetails.voters.findIndex(v => v === u.id), 1);
                    voteDetails.votes.splice(voteDetails.votes.findIndex(v => v.user === u.id), 1);
                }
                voteDetails.voters.push(u.id);
                const vote = { 'voteHash': voteHash };
                if (!voteDetails.secret) vote['user'] = u.id;
                vote['candidate'] = voteDetails.candidates.filter((c, idx) => Object.keys(votes)[idx] === voteHash)[0];
                if (voteHash === 'f09f939d') {
                    vote['key'] = voteDetails.voteId+':'+CRYPTO.randomBytes(4).toString('hex');
                    u.createDM().then(channel => {
                        channel.send(`You have selected the "Write In" option on the ballot for ${voteDetails.position}.  You have been assigned a vote key of **WIV${vote['key']}**.\n\n`+
                                `Please reply with your selection using the following syntax to ensure your vote is tabulated correctly:\n\`WIV${vote['key']}: Jamie Doe\``);
                    });
                } else if (voteHash === 'f09f9aab') {
                    vote['candidate'] = 'None of the Above';
                }
                voteDetails.votes.push(vote);
                if (!voteDetails.secret) {
                    voteDetails.votes.forEach(vote => vote.candidate?votes[vote.voteHash]++:0);
                    const currentTally = [voteDetails.candidates.map((c, idx) => Object.values(votes)[idx]).join('\n'),
                            [votes['f09f939d'], votes['f09f9aab']].join('\n')].join('\n');
                    embedUpdate.spliceFields(1, 1, { 'name': 'Votes:', 'value': currentTally, 'inline': true })
                }
                VOTE_PERSISTANCE.writeFile(voteData);
                embedUpdate.setDescription(`${voteDetails.votes.filter(v => v.candidate).length}/${eligibleIds.length} eligible votes.`);
                r.message.edit(embedUpdate).catch(console.log);
            }
        });
    });
}

function ephemeral(content, interaction, isFollowUp = false) {
    if (!content && !isFollowUp) content = 'done';
    const data = {
        'type': content ? 4 : (isFollowUp ? 5 : 2),
        'data': {
            'content': content,
            'flags': 64
        }
    };
    
    if (content && isFollowUp) CLIENT.api.webhooks(CREDS.id, interaction.token).messages['@original'].patch({ 'data': { 'content': content } });
    else CLIENT.api.interactions(interaction.id, interaction.token).callback.post({ 'data': data });
}

function tweetApproval(collector) {
    return (r, u) => {
        if (u.bot) return;

        const guild = r.message.channel.guild;
        const message = r.message;
        
        const status = message.content.match(/https?:\/\/(www\.)?twitter.com\/.+\/status\/(\d+)/);

        guild.members.fetch(u.id).then(member => {
            if (!member.roles.cache.intersect(new DISCORD.Collection([ [ROLES.ADMIN,] ])).size) return r.users.remove().catch();
            
            const postData = {
                'key': CREDS.webhook,
                'proposer': message.author.id,
                'approver': u.id
            };

            if (status && status[0].length === message.content.length) {
                postData.rtId = status[2];
            } else {
                Object.assign(postData, {
                    'content': message.content,
                    'attachment': message.attachments.array().map(a => { return { 'url': a.url } })
                });
                if (status) postData['containsTweet'] = true;
            }

            const reqOpts = {
                'method': 'POST',
                'headers': {
                    'Content-Type': 'application/json'
                }
            };
            const req = HTTPS.request('https://lpdelaware.api.stdlib.com/twitter-hook@dev/postTweet/', reqOpts, res => {
                console.log('Tweet Approved');
            });
            req.write(JSON.stringify(postData));
            req.end();
            
            collector.stop();
        });
    }
}

CLIENT.on('message', message => {
    if (message.author.bot) return;

    if (message.channel.type === 'dm') {
        const voteMsg = message.content.match(/WIV((\d+):.+): (.+)/);
        if (voteMsg) {
            const vote = BallotCommand.voteData.filter(v => v.voteId.toString() === voteMsg[2])[0];
            if (vote) {
                if (vote.votes.find(v => v.user === message.author.id && v.candidate === voteMsg[3]))
                    return message.channel.send(`You have already submitted a write in vote for ${voteMsg[3]}.  You cannot submit two for the same candidate.`);
                if (vote.candidates.includes(voteMsg[3]))
                    return message.channel.send(`You are trying to submit a write in vote for a listed candidate.  Please vote using the reaction for that candidate.`)
                const wiv = vote.votes.filter(v => v.key === voteMsg[1])[0];
                if (wiv) {
                    delete wiv.key;
                    wiv.candidate = voteMsg[3];
                    VOTE_PERSISTANCE.writeFile(BallotCommand.voteData);
                    CLIENT.channels.fetch(vote.channel).then(channel => {
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
                    return message.channel.send(`Your vote has been recorded.  No data has been saved linking your user information to your selection.`);
                } else return message.channel.send(`You sent me a vote, but I could not match the write in key.`);
            } else return message.channel.send(`You sent me a vote, but I couldn't find the ballot.`);
        } else return message.channel.send(`I only understand write in votes and can't respond to any other direct messages.`);;
    }

    const channel = CLIENT.api.channels(message.channel.id);
    if (message.channel.id === '829194592938360842') {

        if (message.content.length > 280) {
            return channel.messages.post({
                'data': {
                    'content': `This message is too long. (${message.content.length}/280)`,
                    'message_reference': { 'message_id': message.id }
                }
            });
        }

        message.react('👍');

        const collector = message.createReactionCollector(() => true, {})
        collector.on('collect', tweetApproval(collector))
        return;
    }

    const messages = [];

    if (message.mentions.members.has(SEAN)) {
        const loveNote = {
            'data': {
                'content': SEAN_LOVE[Math.floor(Math.random()*SEAN_LOVE.length)],
                'message_reference': {
                    'message_id': message.id
                }
            }
        };
        messages.push({
            'msg': loveNote,
            'cb': messageObj => {
                message.channel.messages.fetch(messageObj.id).then(botMsg => {
                    botMsg.react(':lpd:816223082728783902');
                    botMsg.react('❤️');
                    botMsg.react('🧡');
                    botMsg.react('💛');
                    botMsg.react('💚');
                    botMsg.react('💙');
                    botMsg.react('💜');
                });
            }
        });
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

        messages.push({
            'msg': (taxationIsTheft),
            'cb': messageObj => {
                message.channel.messages.fetch(messageObj.id).then(botMsg => botMsg.react(':lpd:816223082728783902'));
            }
        });
    }

    if (message.content.toLowerCase().includes('off the deep end')) {
        const hypnotoad = {
            'data': {
                'content': 'https://www.overthinkingit.com/wp-content/uploads/2013/09/hypnotoad-animated.gif',
                'message_reference': {
                    'message_id': message.id
                }
            }
        };

        messages.push({
            'msg': (hypnotoad),
            'cb': messageObj => {
                message.channel.messages.fetch(messageObj.id).then(botMsg => botMsg.react(':lpd:816223082728783902'));
            }
        });
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

        messages.push({
            'msg': realLibertarian,
            'cb': messageObj => {
                message.channel.messages.fetch(messageObj.id).then(botMsg => botMsg.react(':lpd:816223082728783902'));
            }
        });
    }

    if (message.content.toLowerCase().match(/(\bdonat(e|ion))(\b|s)/)) {
        const donations = {
            'data': {
                'content': 'Did someone say donate?',
                'embed': new DISCORD.MessageEmbed(DONATION_EMBED),
                'message_reference': {
                    'message_id': message.id
                }
            }
        };

        messages.push({
            'msg': donations,
            'cb': messageObj => {
                message.channel.messages.fetch(messageObj.id).then(botMsg => botMsg.react(':lpd:816223082728783902'));
            }
        });
    }

    messages.reduce((p, msg, idx, a) => {
        if (idx === 0) {
            return channel.messages.post(msg.msg).then(msg.cb);
        } else {
            return message.channel.send(msg.msg.data.content, msg.msg.data.embed).then(msg.cb);
        }
    }, Promise.resolve());

    if (message.content.toLowerCase().includes('lpd') || message.content.toLowerCase().includes('libertarian party of delaware')) {
        message.react(':lpd:816223082728783902');
    }

    if (message.mentions.members.has(CLIENT.user.id)) {
        message.react(':lpd:816223082728783902');
    }
});

CLIENT.ws.on('INTERACTION_CREATE', async interaction => {
    processCommand(interaction.data.options[0].value, interaction);
});

CLIENT.on('guildMemberAdd', member => {
    member.roles.add(ROLES.RESTRICTED);
    member.createDM().then(channel => {
        channel.send(`Please accept the rules in the <#814614335744639058> channel by petting the :hedgehog: to access the rest of the LPD Discord Server.`);
    });
});

CLIENT.once('ready', () => {
    DISCORD_UTILS.PresenceTracker.init(CLIENT);
    SeenCommand.registerTracker(CLIENT);
    QuorumCommand.registerTracker(CLIENT);
    QuorumCommand.reloadManualTrackers(CLIENT);
    PollCommand.reloadPolls(CLIENT);
    BallotCommand.reloadBallots(CLIENT);
    // voteData.forEach((vote, idx) => {
    //     if (vote.voteId > voteId) voteId = vote.voteId+1;
    //     if (new Date(vote.initDate) <= new Date()) {
    //         CLIENT.guilds.fetch(vote.guild).then(guild => {
    //             guild.channels.cache.get(vote.channel)
    //                     .messages.fetch(vote.message).then(message => {
    //                 if (!vote.question) registerBallotListener(message, vote);
    //                 voteId++;
    //             }, e => {
    //                 if (!vote.question) displayBallotPoll(vote);
    //                 voteId++;
    //             });
    //         });
    //     }
    // });

    setInterval(() => {
        CLIENT.user.setActivity('for /lpd help', { 'type': 3 });
        PollCommand.voteData.filter(v => v.message === '-1' && v.question && new Date(v.initDate) <= new Date()).forEach(PollCommand.runSchedule(CLIENT));
        BallotCommand.voteData.filter(v => v.message === '-1' && !v.question && new Date(v.initDate) <= new Date()).forEach(BallotCommand.runSchedule(CLIENT));
    }, 30000);

    RulesCommand.reconnectRules(CLIENT).catch(() => {
        console.log('Lost rules message!');
    }).finally(() => {
        console.log('LPD Bot Online.');
    });
});

CLIENT.login(CREDS.secret).catch(console.log);