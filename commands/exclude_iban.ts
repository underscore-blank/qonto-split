import { args, BaseCommand, flags } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';

import hash from '@adonisjs/core/services/hash';

export default class ExcludeIban extends BaseCommand {
    static commandName = 'qonto:exclude';
    static description = 'Add an IBAN to the exclusion list';

    static options: CommandOptions = {
        startApp: true
    };

    @args.string({
        argumentName: 'iban',
        description: 'IBAN that you need to exclude',
        parse: (iban) => iban.trim().replaceAll(/\s/, '')
    })
    declare iban: string;

    @flags.string({
        flagName: 'name',
        description: 'Custom name of the account to exclude'
    })
    declare name: string;

    async run() {
        // Commands cannot have top level imports, as they are scanned when generating the ace-manifest.json file.
        const Exclusion = (await import('#models/exclusion')).default;
        const exclusions = await Exclusion.all();

        for (const exclusion of exclusions) {
            const match = await hash.verify(exclusion.iban, this.iban);
            if (match) {
                this.logger.warning('This IBAN is already in the exclusion list');
                await this.terminate();
                return;
            }
        }

        const ibanHint = this.iban.slice(-4).padStart(4, '*');
        const ibanName = this.name ? `${this.name} (${ibanHint})` : `Account (${ibanHint})`;

        await Exclusion.create({
            name: ibanName,
            iban: this.iban
        });

        this.logger.success(`${ibanName} successfully added to the exclusion list !`);

        // Terminate app explicitly when staysAlive is enabled in command options.
        // See: https://docs.adonisjs.com/guides/ace/creating-commands#terminating-application
        await this.terminate();
    }

    async completed() {
        if (this.error) {
            this.logger.error(this.error.message);

            // Notify Ace that error has been handled
            return true;
        }
    }
}
