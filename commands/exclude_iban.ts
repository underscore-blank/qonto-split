import { BaseCommand, flags, args } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';

import hash from '@adonisjs/core/services/hash';

export default class ExcludeIban extends BaseCommand {
    static commandName = 'exclude:iban';
    static description = 'Add an IBAN to the exclusion list';

    static options: CommandOptions = {
        startApp: true,
    };

    // need to be an argument
    @args.string({
        argumentName: 'iban',
        description: 'Iban that you need to exclude',
    })
    declare iban: string;

    // TODO: flag name
    @flags.string({})
    declare name: string;

    async run() {
        // Commands cannot have top level imports, as they are scanned when generating the ace-manifest.json file.
        const Exclusion = (await import('#models/exclusion')).default;

        const exclusions = await Exclusion.all();

        for (const exclusion of exclusions) {
            const match = await hash.verify(exclusion.iban, this.iban)
            if (match) {
                this.logger.warning('This IBAN is already in the exclusion list');
                await this.terminate();
                return;
            }
        }

        await Exclusion.create({
            iban: this.iban,
        });

        this.logger.success('IBAN successfully added to the exclusion list');

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
