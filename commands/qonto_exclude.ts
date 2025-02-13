import Exclusion from "#models/exclusion";
import { BaseCommand } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';

import hash from '@adonisjs/core/services/hash';

enum MenuChoice {
    ADD = 'Add',
    REMOVE = 'Remove',
    LIST = 'List',
    EXIT = 'Exit'
}

export default class QontoExclude extends BaseCommand {
    static commandName = 'qonto:exclude';
    static description = 'Manage excluded accounts';

    private exclusion!: typeof Exclusion;

    static options: CommandOptions = {
        startApp: true
    };

    async prepare() {
        this.exclusion = (await import('#models/exclusion')).default;
    }

    async run(): Promise<void> {
        const menuChoice = await this.prompt.choice("What do you want to do ?", [
            { name: MenuChoice.LIST, message: '[list] List all excluded accounts' },
            { name: MenuChoice.ADD, message: '[add] Add account to exclusion list' },
            { name: MenuChoice.REMOVE, message: '[remove] Remove an excluded account' },
            { name: MenuChoice.EXIT, message: '[exit] Exit' }
        ]);

        switch (menuChoice) {
            case MenuChoice.LIST:
                await this.list();
                break;

            case MenuChoice.ADD:
                await this.add();
                break;

            case MenuChoice.REMOVE:
                await this.remove();
                break;

            case MenuChoice.EXIT:
                return await this.terminate();
        }

        return this.run();
    }

    async list() {
        const table = this.ui.table();
        const exclusions = await this.exclusion.all();

        table.head(['ID', 'Name']);

        if (exclusions.length <= 0) {
            table.row(['No exclusions found']);
        }

        for (const exclusion of exclusions.reverse()) {
            table.row([exclusion.id.toString(), exclusion.name]);
        }

        table.render()
    }

    async add() {
        const iban = await this.prompt.ask('Enter the IBAN to exclude', {
            result(value: string): string {
                return value.trim().replaceAll(' ', '').toUpperCase();
            }
        })

        const ibanHint = `${'*'.repeat(4)} ${iban.slice(-4)}`;
        const ibanName = await this.prompt.ask('Add pretty name to the account',  {
            default: `Account (${ibanHint})`,
            result(value: string): string {
                return value.includes(ibanHint) ? value : `${value.trim()} (${ibanHint})`
            }
        })

        const exclusions = await this.exclusion.all();

        for (const exclusion of exclusions) {
            const match = await hash.verify(exclusion.iban, iban);
            if (match) {
                this.logger.warning('This IBAN is already in the exclusion list.');
                return;
            }
        }

        await Exclusion.create({
            name: ibanName,
            iban: iban
        });

        this.logger.success(`${ibanName} successfully added to the exclusion list !`);
    }

    async remove() {
        const exclusions = (await this.exclusion.all()).reverse();
        if (exclusions.length <= 0)
            return this.logger.warning('No account excluded yet.');

        const preparedList = exclusions.map(exclusion => ({ name: exclusion.id.toString(), message: exclusion.name }));
        const selectIbans = await this.prompt.multiple('Select all the IBANs to remove', preparedList);

        for (const selectedIban of selectIbans) {
            const exclusion = exclusions.find((exclusion) => exclusion.id.toString() === selectedIban);
            if (!exclusion) continue;

            await exclusion.delete();
        }

        this.logger.success('Selected IBANs have been removed from the exclusion list.');
    }

    async completed() {
        if (this.error) {
            this.logger.error(this.error.message);

            // Notify Ace that error has been handled
            return true;
        }
    }
}
