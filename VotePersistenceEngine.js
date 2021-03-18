'use strict';

const FS = require('fs');

class VotePersistenceEngine {
    static filename = './voteData.json';

    static readFile() {
        let contents = FS.readFileSync(this.filename);
        return JSON.parse(contents.toString() || '[]');
    }

    static writeFile(voteData) {
        FS.writeFileSync(this.filename, JSON.stringify(voteData));
    }
}

module.exports = VotePersistenceEngine;