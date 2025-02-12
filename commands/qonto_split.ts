import Exclusion from "#models/exclusion";
import WatchedAccount from "#models/watched_account";
import { BaseCommand, flags } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';
import { inject } from '@adonisjs/core';

import env from '#start/env';
import hash from '@adonisjs/core/services/hash';

import QontoService from '#services/qonto_service';
import ProcessedTransaction from '#models/processed_transaction';

import { DateTime, type DateTimeUnit } from 'luxon';

import type { Transaction } from '#types/qonto';

export default class QontoSplit extends BaseCommand {
    public static commandName = 'qonto:split';
    public static description = 'Retrieves new transactions from the Qonto API and processes them';

    public static options: CommandOptions = {
        startApp: true
    };

    @flags.string({
        flagName: 'interval',
        description: 'Defines the time interval for retrieving transactions',
        alias: ['i'],
        default: 'week'
    })
    declare interval: DateTimeUnit;

    @flags.boolean({
        flagName: 'dry',
        description: 'Run commands in dry mode.',
        default: true
    })
    declare dryRun: boolean;

    @flags.boolean({
        flagName: 'auto',
        description: 'Process without interactive mode.',
        default: false
    })
    declare auto: boolean;

    private qontoService!: QontoService;
    private processedTransaction!: typeof ProcessedTransaction;

    private watchedAccounts: WatchedAccount[] = [];
    private excludedAccounts: Exclusion[] = [];

    private withdrawalActions = new Map<string, { accountName: string, iban: string, amount: number }>();
    private transactions: Record<string, Partial<ProcessedTransaction>[]> = {};

    private currentDateTime = DateTime.now();

    @inject()
    public async prepare(qontoService: QontoService) {
        this.qontoService = qontoService;
        this.processedTransaction = (await import('#models/processed_transaction')).default;

        const watchedAccount = (await import('#models/watched_account')).default
        this.watchedAccounts = await watchedAccount.all();

        const exclusion = (await import('#models/exclusion')).default;
        this.excludedAccounts = await exclusion.all();

        const animation = this.logger.await('Fetching organization details');
        animation.start();

        for await (const account of this.watchedAccounts) {
            animation.update(`Fetching transactions for account ${account.name}`);
            const { transactions } = await qontoService.listTransactions({
                bank_account_id: account.qonto_id,

                'operation_type[]': 'income',

                emitted_at_from: this.currentDateTime.startOf(this.interval).toISO(),
                emitted_at_to: this.currentDateTime.endOf(this.interval).toISO()
            });

            const filteredTransactions = await this.filterTransactions(transactions);

            this.transactions[account.qonto_id] = filteredTransactions.map(tx => ({
                transactionId: tx.id,
                amount: tx.amount,
                reference: tx.reference?.trim().replaceAll('\n', ''),
                label: tx.label,
                amountSplit: this.computeSplitAmount(tx)
            }));
        }

        animation.update('Organization details fetched');
        animation.stop();
    }

    public async run() {
        if (Object.keys(this.transactions).length <= 0) {
            this.logger.info('No transactions to process.');
            return await this.terminate();
        }

        const table = this.ui.table();
        const splitPercent = this.defineSplitPercent() * 100;
        table.head(['Account', 'Transaction ID','Reference', 'Amount', 'Split', 'Amount Split']);

        for (const [accountId, transactions] of Object.entries(this.transactions)) {
            const accountName = this.watchedAccounts.find(account => account.qonto_id === accountId)?.name!;
            const amountWithdrawal = transactions.reduce((sum, tx) => sum + tx.amountSplit!, 0);
            const debitIban = await this.qontoService.getAccountIban(accountId);

            for (const tx of transactions) {
                table.row([accountName, tx.transactionId!, tx.reference!, tx.amount?.toFixed(2)!, `${splitPercent}%`, tx.amountSplit?.toFixed(2)!]);
            }

            if (amountWithdrawal > 0)
                this.withdrawalActions.set(accountId, { accountName: accountName, iban: debitIban, amount: amountWithdrawal });
        }

        table.render();

        if (!this.auto && !await this.prompt.confirm('Do you want to proceed with the transactions ?')) {
            this.logger.warning('Aborted by user.');
            return await this.terminate();
        }

        for (const withdrawal of this.withdrawalActions.values()) {
            if (!this.dryRun) {
                await this.qontoService.internalTransfer(withdrawal.amount, withdrawal.iban);
            }

            this.logger.info(`Withdraw ${withdrawal.amount} from ${withdrawal.accountName} successfully.`);
        }

        await this.terminate();
    }

    private async filterTransactions(transactions: Transaction[]) {
        const filtered = await Promise.all(
            transactions.map(async (tx) => {
                const processed = await this.processedTransaction.findBy('transaction_id', tx.id);
                if (processed) return null;

                const accountIban = await this.qontoService.getAccountIban(tx.bank_account_id);
                const excludedMatches = await Promise.all(
                    this.excludedAccounts.map(async (exclusion) => {
                        return await hash.verify(exclusion.iban, accountIban);
                    })
                );

                if (excludedMatches.some(match => match)) return null;
                return tx;
            })
        );

        return filtered.filter((tx): tx is Transaction => tx !== null);
    }

    private defineSplitPercent(): number {
        return Number(env.get('SPLIT_AMOUNT_PERCENT')) > 1
            ? Number(env.get('SPLIT_AMOUNT_PERCENT')) / 100
            : Number(env.get('SPLIT_AMOUNT_PERCENT'));
    }

    private computeSplitAmount(transaction: Transaction): number {
        const percent = this.defineSplitPercent();
        const amount = env.get('VAT_MODE') === true
            ? transaction.amount - (transaction.amount / (percent + 1))
            : transaction.amount * percent;

        return Number(amount.toFixed(2));
    }
}
