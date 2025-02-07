import { BaseCommand, flags } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';
import { inject } from '@adonisjs/core';

import env from '#start/env';

import QontoService from '#services/qonto_service';

import { DateTime, type DateTimeUnit } from 'luxon';

import type { Transaction } from '#types/qonto';

export default class PollTransactions extends BaseCommand {
    public static commandName = 'poll:transactions';
    public static description = 'Retrieves new transactions from the Qonto API and processes them';

    public static options: CommandOptions = {
        startApp: true
    };

    @flags.string({
        flagName: 'interval',
        description: 'Defines the time interval for retrieving transactions',
        alias: ['i'],
        default: 'year'
    })
    declare interval: DateTimeUnit;

    @flags.string({
        flagName: 'account',
        description: 'Specifies the bank account ID for which to retrieve transactions',
        alias: ['a']
    })
    declare account: string;

    private currentDateTime = DateTime.now();

    @inject()
    public async prepare(qontoService: QontoService) {
        const watchedAccountIds = this.account
            ? [this.account]
            : this.getWatchedAccountIds();

        const transactionsByAccountIds = await Promise.all(
            watchedAccountIds.map(async (accountId) => {
                const { transactions } = await qontoService.listTransactions({
                    bank_account_id: accountId,

                    'operation_type[]': 'income',

                    emitted_at_from: this.currentDateTime.startOf(this.interval).toISO(),
                    emitted_at_to: this.currentDateTime.endOf(this.interval).toISO()
                });

                return transactions;
            })
        );

        return transactionsByAccountIds.flat();
    }

    public async run() {
        await this.terminate();
    }

    private getWatchedAccountIds(): string[] {
        const accountsEnv = env.get('QONTO_WATCH_ACCOUNTS_IDS');
        return accountsEnv
            .split(',')
            .map(id => id.trim())
            .filter(Boolean);
    }

    // private async filterTransactions(transactions: Transaction[]) {
    //     const Exclusion = (await import('#models/exclusion')).default;
    //
    //     const exclusions = await Exclusion.all();
    //
    //     return transactions.filter(
    //         transaction =>
    //     );
    // }

    @inject()
    private async processTransaction(transaction: Transaction, qontoService: QontoService) {
        const ProcessedTransactions = (await import('#models/processed_transaction')).default;

        const vatAmount = transaction.amount * 0.2;
        const remainingAmount = transaction.amount - vatAmount;

        await qontoService.transferToVATAccount(vatAmount);

        await ProcessedTransactions.create({
            transactionId: transaction.id,
            amount: transaction.amount,
            reference: transaction.reference,
            label: transaction.label,
            amountSplit: remainingAmount
        });

        this.logger.success(`Transaction ${transaction.id} treated. VAT: ${vatAmount}`);
    }
}
