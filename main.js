'use strict';

import DISCORD from 'discord.js';

import DISCORD_UTILS from './utils/discord-utils.js';

import COMMAND_MAPPER from './command-controller/commandMapper.js';

import CREDS from './constants/creds.js';
import ROLES from './constants/roles.js';
import CHANS from './constants/channels.js';

import TaxationResponder from './message-controller/taxation.js';
import SeanLoveResponder from './message-controller/sean.js';
import HypnoToadResponder from './message-controller/hypnotoad.js';
import RealLibertarianResponder from './message-controller/libertarian.js';
import DonateResponder from './message-controller/donate.js';
import Reactor from './message-controller/reactor.js';
import TwitterSubmissionResponder from './message-controller/twitter.js';

const BaseCommand = COMMAND_MAPPER['lpd']['ping']['class'];
const RulesCommand = COMMAND_MAPPER['lpd']['rules']['class'];
const SeenCommand = COMMAND_MAPPER['lpd']['seen']['class'];
const QuorumCommand = COMMAND_MAPPER['lpd']['quorum']['class'];
const PollCommand = COMMAND_MAPPER['lpd']['poll']['class'];
const BallotCommand = COMMAND_MAPPER['lpd']['ballot']['class'];

const CLIENT = new DISCORD.Client();

const MESSAGE_HANDLERS = [];
const DM_HANDLERS = [];

CLIENT.on('message', message => {
    if (message.author.bot) return;

    if (message.channel.type === 'dm') {
        const dmResponses = DM_HANDLERS.map(handler => handler.handleMessage(message));
        const dmResponse = dmResponses.filter(r => r).join('\n').trim() || `I don't understand.`;
        message.channel.send(dmResponse);
        return;
    }

    const messages = MESSAGE_HANDLERS.map(handler => handler.handleMessage(message));
    const channel = CLIENT.api.channels(message.channel.id);

    messages.reduce((p, msg, idx, a) => {
        if (!msg) return Promise.resolve();
        if (idx === 0) {
            return channel.messages.post(msg.msg).then(msg.cb);
        } else {
            return message.channel.send(msg.msg.data.content, msg.msg.data.embed).then(msg.cb);
        }
    }, Promise.resolve());
});

CLIENT.on('guildMemberAdd', member => {
    member.roles.add(ROLES.RESTRICTED);
    member.createDM().then(channel => {
        channel.send(`Please accept the rules in the <#${CHANS.RULES_CHAN}> channel by petting the :hedgehog: to access the rest of the LPD Discord Server.`);
    });
});

CLIENT.ws.on('INTERACTION_CREATE', async interaction => {
    console.log(interaction.data.options[0].value);
    BaseCommand.runCommand(interaction, CLIENT);
});

CLIENT.once('ready', () => {
    DISCORD_UTILS.PresenceTracker.init(CLIENT);
    SeenCommand.registerTracker(CLIENT);
    QuorumCommand.registerTracker(CLIENT);
    QuorumCommand.reloadManualTrackers(CLIENT);
    PollCommand.reloadPolls(CLIENT);
    BallotCommand.reloadBallots(CLIENT);
    RulesCommand.reconnectRules(CLIENT);

    MESSAGE_HANDLERS.push(TaxationResponder);
    MESSAGE_HANDLERS.push(SeanLoveResponder);
    MESSAGE_HANDLERS.push(HypnoToadResponder);
    MESSAGE_HANDLERS.push(RealLibertarianResponder);
    MESSAGE_HANDLERS.push(DonateResponder);
    MESSAGE_HANDLERS.push(TwitterSubmissionResponder);
    MESSAGE_HANDLERS.push(new Reactor(CLIENT));

    DM_HANDLERS.push(BallotCommand.generateWriteInHandler(CLIENT));

    setInterval(() => {
        CLIENT.user.setActivity('for /lpd help', { 'type': 3 });
        PollCommand.voteData.filter(v => v.message === '-1' && v.question && new Date(v.initDate) <= new Date())
                .forEach(PollCommand.runSchedule(CLIENT));
        BallotCommand.voteData.filter(v => v.message === '-1' && !v.question && new Date(v.initDate) <= new Date())
                .forEach(BallotCommand.runSchedule(CLIENT));
    }, 30000);

    console.log('LPD Bot Online.');
});

CLIENT.login(CREDS.secret).catch(console.log);