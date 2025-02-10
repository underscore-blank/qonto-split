import { BaseCommand, flags } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';
import { inject } from '@adonisjs/core';

import env from '#start/env';
import hash from '@adonisjs/core/services/hash';

import QontoService from '#services/qonto_service';

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
        description: '',
        alias: ['d'],
        default: true
    })
    declare dryRun: boolean;

    private currentDateTime = DateTime.now();
    private transactions: Transaction[] = [];

    private qontoService!: QontoService;

    @inject()
    public async prepare(qontoService: QontoService) {
        const transactionsByAccountIds = await Promise.all(
            this.accounts.map(async (accountId) => {
                const { transactions } = await qontoService.listTransactions({
                    bank_account_id: accountId,

                    'operation_type[]': 'income',

                    emitted_at_from: this.currentDateTime.startOf(this.interval).toISO(),
                    emitted_at_to: this.currentDateTime.endOf(this.interval).toISO()
                });

                return transactions;
            })
        );

        this.qontoService = qontoService;

        this.transactions = await this.filterTransactions(transactionsByAccountIds.flat());
    }

    public async run() {
        const filteredTransactions = await this.filterTransactions(this.transactions)

        await Promise.all(
            filteredTransactions.map(async (transaction) => {
                await this.processTransaction(transaction);
            })
        );

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

    private async processTransaction(transaction: Transaction) {
        const ProcessedTransactions = (await import('#models/processed_transaction')).default;

        const percent = env.get('SPLIT_AMOUNT_PERCENT') > 1
            ? env.get('SPLIT_AMOUNT_PERCENT') / 100
            : env.get('SPLIT_AMOUNT_PERCENT');

        const splitAmount = (env.get('VAT_MODE')
            ? transaction.amount - (transaction.amount / (percent + 1))
            : transaction.amount * percent).toFixed(2);

        const debitIban = await this.qontoService.getAccountIban(transaction.bank_account_id);

        if (!this.dryRun)
            await this.qontoService.transferToVATAccount(splitAmount, debitIban);

        await ProcessedTransactions.create({
            transactionId: transaction.id,
            amount: transaction.amount,
            reference: transaction.reference,
            label: transaction.label,
            amountSplit: Number(splitAmount)
        });

        this.logger.success(`Transaction ${transaction.reference} treated => ${splitAmount}`);
    }
}
