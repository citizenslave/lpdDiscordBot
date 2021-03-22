'use strict';

import BaseCommand from '../baseCommand.js';

export default class ClearCommand extends BaseCommand {
    execute(params) {
        this.channel.messages.fetch({ 'limit': 5 }).then(messages => {
            Promise.all(messages.map(message => message.delete())).then(() => {
                if (messages.size) this.execute(params);
            }).catch(console.log);
        });
    }
}