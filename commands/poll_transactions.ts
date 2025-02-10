import { BaseCommand, flags } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';
import { inject } from '@adonisjs/core';

import env from '#start/env';
import hash from '@adonisjs/core/services/hash';

import QontoService from '#services/qonto_service';
import ProcessedTransaction from '#models/processed_transaction';

import { DateTime, type DateTimeUnit } from 'luxon';

import type { Transaction } from '#types/qonto';

export default class PollTransactions extends BaseCommand {
    public static commandName = 'qonto:transactions';
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
        flagName: 'accounts',
        description: 'Specifies the bank accounts ID\'s for which to retrieve transactions',
        alias: ['a'],
        default: env.get('QONTO_WATCH_ACCOUNTS_IDS')
            .split(',')
            .map(id => id.trim())
            .filter(Boolean)
    })
    declare accounts: string[];

    @flags.boolean({
        flagName: 'dry',
        description: 'Run commands in dry mode for development',
        alias: ['d'],
        default: true
    })
    declare dryRun: boolean;

    private currentDateTime = DateTime.now();
    private transactions: Record<string, Partial<ProcessedTransaction>[]> = {};

    private qontoService!: QontoService;

    @inject()
    public async prepare(qontoService: QontoService) {
        this.qontoService = qontoService;

        for await (const accountId of this.accounts) {
            const { transactions } = await qontoService.listTransactions({
                bank_account_id: accountId,

                'operation_type[]': 'income',

                emitted_at_from: this.currentDateTime.startOf(this.interval).toISO(),
                emitted_at_to: this.currentDateTime.endOf(this.interval).toISO()
            });

            const filteredTransactions = await this.filterTransactions(transactions);

            this.transactions[accountId] = filteredTransactions.map(tx => ({
                transactionId: tx.id,
                amount: tx.amount,
                reference: tx.reference,
                label: tx.label,
                amountSplit: this.computeSplitAmount(tx)
            }));
        }
    }

    public async run() {
        const ProcessedTransactions = (await import('#models/processed_transaction')).default;

        for (const [accountId, transactions] of Object.entries(this.transactions)) {
            const amountWithdrawal = transactions.reduce((sum, tx) => sum + tx.amountSplit!, 0);

            const debitIban = await this.qontoService.getAccountIban(accountId);

            if (!this.dryRun) {
                await this.qontoService.internalTransfer(amountWithdrawal, debitIban);
                await ProcessedTransactions.createMany(transactions);
            }
        }

        await this.terminate();
    }

    private async filterTransactions(transactions: Transaction[]) {
        const Exclusion = (await import('#models/exclusion')).default;
        const ProcessedTransactions =
            (await import('#models/processed_transaction')).default;

        const exclusions = await Exclusion.all();

        const filtered = await Promise.all(
            transactions.map(async (tx) => {
                const processed = await ProcessedTransactions
                    .findBy('transaction_id', tx.id);

                if (processed) return null;

                const accountIban = await this.qontoService.getAccountIban(tx.bank_account_id);

                const excludedMatches = await Promise.all(
                    exclusions.map(async (exclusion) => {
                        return await hash.verify(exclusion.iban, accountIban);
                    })
                );
                if (excludedMatches.some(match => match)) return null;

                return tx;
            })
        );

        return filtered
            .filter((tx): tx is Transaction => tx !== null);
    }

    private computeSplitAmount(transaction: Transaction): number {
        const percent = Number(env.get('SPLIT_AMOUNT_PERCENT')) > 1
            ? Number(env.get('SPLIT_AMOUNT_PERCENT')) / 100
            : Number(env.get('SPLIT_AMOUNT_PERCENT'));

        const amount = env.get('VAT_MODE') === true
            ? transaction.amount - (transaction.amount / (percent + 1))
            : transaction.amount * percent;

        return Number(amount.toFixed(2));
    }
}
