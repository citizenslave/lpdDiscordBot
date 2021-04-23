'use strict';

import DISCORD from 'discord.js';
import HTTPS from 'https';

import CREDS from '../constants/creds.js';
import ROLES from '../constants/roles.js';

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
}