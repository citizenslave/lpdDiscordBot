'use strict';

import BaseCommand from '../baseCommand.js';
import FilePersistenceEngine from '../../utils/FilePersistenceEngine.js';

export default class SeenCommand extends BaseCommand {
    static connected = false;
    static presenceData;

    execute(params) {
        const presence = this.guild.presences.cache.get(params[1]);
        if (presence && presence.status === 'online') return this.ephemeral(`<@!${params[1]}> is online now.`);
        const lastPresence = SeenCommand.lastSeen(params[1]);
        if (!lastPresence) return this.ephemeral(`<@!${params[1]}> hasn't been seen...`);
        this.ephemeral(`<@${params[1]}> was last seen ${lastPresence.toLocaleString()}`)
    }

    static lastSeen(memberId) {
        const lastPresence = this.presenceData.find(p => p.user === memberId);
        if (!lastPresence) return null;
        else return new Date(lastPresence.lastSeen);
    }

    static registerTracker(client) {
        if (this.connected) return console.log('Presence tracker already registered.');
        const PRESENCE_PERSISTANCE = new FilePersistenceEngine('./data/storage/presenceData');
        this.presenceData = PRESENCE_PERSISTANCE.readFile();
        if (!this.presenceData.length) PRESENCE_PERSISTANCE.writeFile(this.presenceData);
        client.on('presenceUpdate', (o, n) => {
            if (!o) return;
            if (o.status === 'online' && (n.status !== 'online' || !n)) {
                const currentIndex = this.presenceData.findIndex(p => p.user === n.userID);
                if (currentIndex >= 0) this.presenceData.splice(currentIndex, 1);
                this.presenceData.push({
                    'user': n.userID,
                    'lastSeen': new Date().toISOString()
                });
                PRESENCE_PERSISTANCE.writeFile(this.presenceData);
            }
        });
        this.connected = true;
    }
}