'use strict';

export default class Reactor {
    client;

    constructor(client) {
        this.client = client;
    }

    handleMessage(message) {
        if (message.content.toLowerCase().includes('lpd') || message.content.toLowerCase().includes('libertarian party of delaware')) {
            message.react(':lpd:816223082728783902');
        }
    
        if (message.mentions.members.has(this.client.user.id)) {
            message.react(':lpd:816223082728783902');
        }
    }
}