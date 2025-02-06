import { BaseCommand } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';

import { inject } from '@adonisjs/core';

import QontoService from '#services/qonto_service';

export default class ListAccounts extends BaseCommand {
    static commandName = 'list:accounts';
    static description = 'List organization bank accounts';

    static options: CommandOptions = {};

    @inject()
    async run(qontoService: QontoService) {
        const { organization } = await qontoService.organizationDetails();

        const bankAccounts = organization.bank_accounts;
        for (const account of bankAccounts) {
            this.logger.log(`
                Name  : \x1b[32m${account.name}\x1b[0m
                IBAN  : \x1b[33m${account.iban}\x1b[0m
                ID    : \x1b[35m${account.id}\x1b[0m
            `.replace(/\n\s+/g, '\n'));
        }
    }
}
