'use strict';

import DISCORD from 'discord.js';

import CREDS from '../constants/creds.js';
import ROLES from '../constants/roles.js';
import CHANS from '../constants/channels.js';

import UTILS from '../utils/utils.js';

const LINK = /https?:\/\/\S*/g;
const FB_LINK_I = /^https?:\/\/.*facebook\.com\/(\d*)\/posts\/(.*)\/?$/;
const FB_LINK_R = /^https?:\/\/.*facebook\.com\/(.*)\/posts\/(.*)\/?$/;
const FB_LINK_M = /^https?:\/\/.*facebook\.com\/story\.php\?story_fbid=(\d+)&id=(\d+)$/;
const FB_SHARE = /https:\/\/.*facebook\.com\/l\.php\?u=(.*)&h=.*/;
const STATUS_LINK = /https?:\/\/(?:www\.)?twitter\.com\/.+\/status\/(\d+)/;

const PAGES = {
    '3c3a6c70643a3831363232333038323732383738333930323e': '209602722401635',    // state
    'f09f87b0': '152735338075471',                                              // kent
    'f09f87b8': '142120825820677'                                               // sussex
}
const STATE_ACCESS = CREDS.fb_access['3c3a6c70643a3831363232333038323732383738333930323e'];

export default class FacebookSubmissionResponder {
    static handleMessage(message) {
        if (message.channel.id === CHANS.FACEBOOK_CHAN && !message.channel.bot && !message.content.startsWith('!!')) {
            message.react('👍');
            message.react(':lpd:816223082728783902');
            if (message.content.length < 280) message.react(':twitter:861621320672215060');
            message.react('❌');
    
            const collector = message.createReactionCollector(() => true, {});
            collector.on('collect', this.fbApproval(collector));
            return;
        }
    }

    static fbApproval(collector) {
        const reactions = [];
        return (r, u) => {
            if (u.bot) return;
    
            const guild = r.message.channel.guild;
            const message = r.message;
    
            guild.members.fetch(u.id).then(member => {
                if (!member.roles.cache.intersect(new DISCORD.Collection([ [ROLES.CONTRIBUTORS,] ])).size)
                    return r.users.remove(u).catch();

                const reactHash = Buffer.from(r.emoji.toString()).toString('hex');
                
                if (reactHash === 'e29d8c') {
                    message.reactions.removeAll();
                    collector.stop();
                    return;
                } else if (Object.keys(PAGES).includes(reactHash) || reactHash === '3c3a747769747465723a3836313632313332303637323231353036303e') {
                    if (reactions.includes(reactHash)) reactions.splice(reactions.indexOf(reactHash), 1);
                    reactions.push(reactHash);
                    return;
                } else if (reactHash !== 'f09f918d') return;
    
                message.reactions.cache.forEach(existingReact => {
                    const currentHash = Buffer.from(existingReact.emoji.toString()).toString('hex');
                    if (currentHash === 'e29d8c') existingReact.remove();
                });
                reactions.forEach((v, i, a) => {
                    if (!message.reactions.cache.find(r => Buffer.from(r.emoji.toString()).toString('hex') === v && r.users.cache.size > 1)) a[i] = '';
                });

                if (reactions.includes('3c3a747769747465723a3836313632313332303637323231353036303e')) {
                    const status = message.content.match(STATUS_LINK);
                    const fbLink = FB_LINK_M.exec(message.content) || FB_LINK_I.exec(message.content) || FB_LINK_R.exec(message.content);
                    const fbInfo = [Promise.resolve()];

                    const postData = {
                        'key': CREDS.webhook,
                        'proposer': message.author.id,
                        'approver': u.id
                    };

                    const fbResolve = [Promise.resolve()];

                    if (fbLink && isNaN(fbLink[1])) {
                        fbResolve.push(UTILS.getHttpsRequest(`https://graph.facebook.com/v11.0/${fbLink[1]}?access_token=${STATE_ACCESS}`));
                    }

                    Promise.all(fbResolve).then(resData => {
                        let pageId, storyId;
                        if (resData.length > 1) {
                            pageId = JSON.parse(resData[1].toString()).id;
                            storyId = fbLink[2];
                        } else if (FB_LINK_M.test(message.content)) {
                            pageId = fbLink[2];
                            storyId = fbLink[1];
                        } else if (FB_LINK_I.test(message.content)) {
                            pageId = fbLink[1];
                            storyId = fbLink[2];
                        }
                        if (fbLink) {
                            fbInfo.push(UTILS.getHttpsRequest(`https://graph.facebook.com/v11.0/${pageId}_${storyId}?access_token=${STATE_ACCESS}`));
                            fbInfo.push(UTILS.getHttpsRequest(`https://graph.facebook.com/v11.0/${pageId}_${storyId}/attachments?access_token=${STATE_ACCESS}`));
                        }
                        Promise.all(fbInfo).then(fbData => {
                            let attachmentList = [], content;
                            if (fbData.length > 1) {
                                fbData.shift();
                                fbData = fbData.map(d => JSON.parse(d.toString()));
                                content = fbData[0].message || '';
                                if (fbData[1].data[0].type === 'share') {
                                    content += `\n${unescape(FB_SHARE.exec(fbData[1].data[0].url)[1])}`;
                                } else if (fbData[1].data[0].type === 'photo') {
                                    attachmentList = [{ 'url': fbData[1].data[0].media.image.src }];
                                }
                            } else {
                                content = message.content;
                                attachmentList = message.attachments;
                            }
                            const attachments = attachmentList.map(a => UTILS.getHttpsRequest(a.url));
                            attachments.push(Promise.resolve());
                            
                            Promise.all(attachments).then(buffers => {
                                if (status && status[0].length === message.content.length) {
                                    postData.rtId = status[1];
                                } else {
                                    postData['content'] = content;
                                    if (buffers.length > 1) postData['attachments'] = buffers.filter(b => b).map(b => b.toString('base64'));
                                    if (status) {
                                        postData['containsTweet'] = status[1];
                                        postData['content'] = postData['content'].replace(STATUS_LINK, '').trim();
                                    }
                                }

                                UTILS.postHttpsRequest('https://lpdelaware.api.stdlib.com/twitter-hook@dev/postTweet/', postData).then(r => {
                                    message.channel.send(`https://twitter.com/${r.twitter.user.id_str}/status/${r.twitter.id_str}`);
                                });
                            });
                        });
                    });
                    reactions.splice(reactions.findIndex(i => i === '3c3a747769747465723a3836313632313332303637323231353036303e'), 1);
                }

                if (!reactions.includes('3c3a6c70643a3831363232333038323732383738333930323e')) return;
                const urls = [];
                
                for (let url; url=LINK.exec(message.content);) {
                    urls.push({ 't': url[0], 'i': url.index });
                }
                let replace = false;
                if (urls.length === 1) {
                    if (!urls[0].i || urls[0].i+urls[0].t.length === message.content.length) replace = true;
                }
    
                const content = {
                    'message': (!replace?message.content:message.content.replace(urls[0].t, '')).trim()
                };
                if (urls.length === 1) content['link'] = urls[0].t;
    
                const attachments = message.attachments.map(a => {
                    const photoContent = {
                        'url': a.url,
                        'published': false,
                        'temporary': true
                    };
                    return UTILS.postHttpsRequest(`https://graph.facebook.com/v11.0/209602722401635/photos?access_token=${STATE_ACCESS}`, photoContent);
                });
                attachments.push(Promise.resolve());
                
                Promise.all(attachments).then(buffers => {
                    if (buffers.length > 1) {
                        content['attached_media'] = buffers.filter(b => b).map(b => {
                            return {
                                'media_fbid': b.id
                            };
                        });
                    }
                    UTILS.postHttpsRequest(`https://graph.facebook.com/v11.0/209602722401635/feed?access_token=${STATE_ACCESS}`, content)
                            .catch(console.error)
                            .then(res => {
                                message.channel.send(`https://www.facebook.com/${res.id}`);
                                if (false && reactions.length > 1) {
                                    reactions.splice(0, 1);
                                    const shareContent = {
                                        'link': `https://www.facebook.com/${res.id}`
                                    };
                                    const shareCalls = reactions.map(page => {
                                        return UTILS.postHttpsRequest(`https://graph.facebook.com/v11.0/${PAGES[page]}/feed?access_token=${CREDS.fb_access[page]}`, shareContent);
                                    });
                                    Promise.all(shareCalls).catch(console.log);
                                }
                            });
                });

                collector.stop();
            });
        }
    }

    static reconnect(client) {
        client.channels.resolve(CHANS.FACEBOOK_CHAN).messages.fetch({ 'cache': true }).then(messages => {
            messages = messages.filter(m => m.reactions.cache.size === 4);
            messages.forEach(m => {
                const collector = m.createReactionCollector(() => true, {});
                collector.on('collect', this.fbApproval(collector));
            });
        });
    }
}