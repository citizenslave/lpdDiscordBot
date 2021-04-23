'use strict';

import USERS from '../constants/users.js';

const SEAN_LOVE = [
    `<@!${USERS.SEAN}> is :heart:...`,
    `<@!${USERS.SEAN}> will always be the state chair of my :heart:...`,
    `<@!${USERS.SEAN}> is the best! :heart_eyes:`,
    `I :heart: <@!${USERS.SEAN}> more than I did yesterday, but not more than I will tomorrow...`,
    `No matter how far <@!${USERS.SEAN}> may be, he'll always remain close to my :heart:...`,
    `<@!${USERS.SEAN}> tripped me, so I fell for him...`,
    `<@!${USERS.SEAN}> makes my :heart: melt!`,
    `Whenever my event handler activates, I hope <@!${USERS.SEAN}> is the reason for it.`,
    `<@!${USERS.SEAN}> can't tax me, because I consent.`,
    `I want government out of my bedroom, but <@!${USERS.SEAN}> is welcome any time.`,
    `<@!${USERS.SEAN}> occupies my :heart: like the US occupies the Middle East...`,
    `<@!${USERS.SEAN}> can indefinitely detain ME!`,
    `<@!${USERS.SEAN}>, wanna Lysander Spoon?`,
    `<@!${USERS.SEAN}> has got some tangible assets!`,
    `<@!${USERS.SEAN}> is my ACA penalty.  He's got FINE written all over him!`,
    `<@!${USERS.SEAN}> can call me any time.  I'm always free.`,
    `<@!${USERS.SEAN}> is lucky they don't tax good looks.`,
    `<@!${USERS.SEAN}> raises my :heart: rate like Republicans and Democrats raise the debt.`,
    `<@!${USERS.SEAN}> makes my interface GUI!`,
    `<@!${USERS.SEAN}> can void my warranty!`,
    `<@!${USERS.SEAN}>, I'm the droid you're looking for!`,
    `<@!${USERS.SEAN}> can whip my nae nae!`,
    `<@!${USERS.SEAN}> has a pet name for me...it's Leg-Hump-A-Tron 3000 :heart_eyes:`
];

export default class SeanLoveResponder {
    static handleMessage(message) {
        if (message.mentions.members.has(USERS.SEAN)) {
            const loveNote = {
                'data': {
                    'content': SEAN_LOVE[Math.floor(Math.random()*SEAN_LOVE.length)],
                    'message_reference': {
                        'message_id': message.id
                    }
                }
            };

            return {
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
            };
        }
    }
}