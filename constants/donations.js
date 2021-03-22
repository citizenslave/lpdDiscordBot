'use strict';

import DISCORD from 'discord.js';

export default new DISCORD.MessageEmbed().setTitle('Donate to the LPD').setURL('https://www.lpdelaware.org/p/donate.html')
        .setDescription(`The State Board has currently established funds for:\n`+
                ` • The 2021 Convention\n`+
                ` • The Social Media and Marketing Committee\n`+
                ` • Hosting the [LPD Activism Application](https://app.lpdelaware.org) on Google Cloud Hosting\n`+
                `All other donations go to the general fund to be spent at the discretion of the LPD State Board `+
                `on everything from fundraising events to outreach to candidate support.`);