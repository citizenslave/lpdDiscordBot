'use strict';

const FS = require('fs');

class FilePersistenceEngine {
    filename;

    constructor(filename) {
        this.filename = filename;
    }

    readFile() {
        let contents = FS.readFileSync(this.filename, {'flag': 'a+'});
        return JSON.parse(contents.toString() || '[]');
    }

    writeFile(data) {
        FS.writeFileSync(this.filename, JSON.stringify(data));
    }
}

module.exports = FilePersistenceEngine;