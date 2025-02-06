import { BaseCommand, flags } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';
import { inject } from '@adonisjs/core';

import env from '#start/env';
import hash from '@adonisjs/core/services/hash';

import QontoService from '#services/qonto_service';

import { DateTime } from 'luxon';

import { Transaction } from '#types/qonto';

export default class PollTransactions extends BaseCommand {
    public static commandName = 'poll:transactions';
    public static description = 'Retrieves new transactions from the Qonto API and processes them';

    public static options: CommandOptions = {
        startApp: true,
    }

    private dt = DateTime.now(); // refactor
    private transactions: Transaction[] = [];

    @inject()
    public async prepare(qontoService: QontoService) {
        const accountsToWatchIdsEnv = env.get('QONTO_WATCH_ACCOUNTS_IDS');
        const accountsToWatchIds = accountsToWatchIdsEnv
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);

        const transactionsByAccountIds = await Promise.all(
            accountsToWatchIds.map(async (accountId) => {
                const { transactions } = await qontoService.listTransactions({
                    bank_account_id: accountId,

                    'operation_type[]': 'income',

                    'emitted_at_from': this.dt.startOf('month').toISO(),
                    'emitted_at_to': this.dt.endOf('day').toISO(),
                })

                return transactions;
            })
        );

        console.log(transactionsByAccountIds.flat());

        return;
    }

    public async interact() {
        // exec list:accounts command
    }

    public async run() {
        const Exclusion = (await import('#models/exclusion')).default;

        const exclusions = await Exclusion.all();

        for (const tx of this.transactions) {
            const txIban = tx.income?.counterparty_account_number!;
            for (const exclusion of exclusions) {
                if (await hash.verify(exclusion.iban, txIban)) {
                    this.logger.log(exclusion.iban);
                }
            }
        }

        // console.log(this.transactions);

        await this.terminate();
    }
}
