'use strict';

import DISCORD from 'discord.js';

import CREDS from '../constants/creds.js';
import ROLES from '../constants/roles.js';

import UTILS from '../utils/utils.js';

export default class TwitterSubmissionResponder {
    static handleMessage(message) {
        if (message.channel.id === '829194592938360842') {
            if (message.content.length > 280) {
                return {
                    'msg': {
                        'data': {
                            'content': `This message is too long. (${message.content.length}/280)`,
                            'message_reference': { 'message_id': message.id }
                        }
                    },
                    'cb': () => {}
                };
            }
            if (message.attachments.size > 4) {
                return {
                    'msg': {
                        'data': {
                            'content': `Too many attachments. (${message.attachments.size}/4)`,
                            'message_reference': { 'message_id': message.id }
                        }
                    },
                    'cb': () => {}
                }
            }
    
            message.react('👍');
    
            const collector = message.createReactionCollector(() => true, {})
            collector.on('collect', this.tweetApproval(collector))
            return;
        }
    }

    static tweetApproval(collector) {
        return (r, u) => {
            if (u.bot) return;
    
            const guild = r.message.channel.guild;
            const message = r.message;
            
            const status = message.content.match(/https?:\/\/(www\.)?twitter.com\/.+\/status\/(\d+)/);
    
            guild.members.fetch(u.id).then(member => {
                if (!member.roles.cache.intersect(new DISCORD.Collection([ [ROLES.ADMIN,], [ROLES.SMM_DT,], [ROLES.STATE_BOARD,] ])).size)
                    return r.users.remove().catch();
                
                const postData = {
                    'key': CREDS.webhook,
                    'proposer': message.author.id,
                    'approver': u.id
                };
    
                const attachments = message.attachments.map(a => UTILS.getHttpsRequest(a.url));
                attachments.push(Promise.resolve());
                
                Promise.all(attachments).then(buffers => {
                    if (status && status[0].length === message.content.length) {
                        postData.rtId = status[2];
                    } else {
                        postData['content'] = message.content;
                        if (buffers.length > 1) postData['attachments'] = buffers.filter(b => b).map(b => b.toString('base64'));
                        if (status) postData['containsTweet'] = status[2];
                    }

                    UTILS.postHttpsRequest('https://lpdelaware.api.stdlib.com/twitter-hook@dev/postTweet/', postData).then(r => {
                        console.log('Tweet Approved');
                    });
                });
                
                collector.stop();
            });
        }
    }
}