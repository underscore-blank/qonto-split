import env from "#start/env";
import { inject } from '@adonisjs/core';
import hash from '@adonisjs/core/services/hash';
import { DateTime, type DateTimeUnit } from 'luxon';
import { BaseCommand, flags } from '@adonisjs/core/ace';

import QontoService from '#services/qonto_service';

import WatchedAccount from "#models/watched_account";
import Exclusion from "#models/exclusion";
import ProcessedTransaction from '#models/processed_transaction';
import { ConfigKey } from "#models/config";

import type { Transaction } from '#types/qonto';
import type { CommandOptions } from '@adonisjs/core/types/ace';

export default class QontoSplit extends BaseCommand {
    public static commandName = 'qonto:split';
    public static description = 'Retrieves new transactions from watched accounts and splits them.';

    public static options: CommandOptions = {
        startApp: true
    };

    @flags.string({
        flagName: 'interval',
        description: 'Defines the time interval for retrieving transactions.',
        default: 'week'
    })
    declare interval: DateTimeUnit;

    @flags.boolean({
        flagName: 'dry',
        description: 'Run commands in dry mode.',
        default: ['development', 'test'].includes(env.get('NODE_ENV', 'development'))
    })
    declare dryRun: boolean;

    @flags.boolean({
        flagName: 'interactive',
        alias: 'i',
        description: 'Process in interactive mode.',
        default: false
    })
    declare interactive: boolean;

    private qontoService!: QontoService;
    private processedTransaction!: typeof ProcessedTransaction;

    private watchedAccounts: WatchedAccount[] = [];
    private excludedAccounts: Exclusion[] = [];

    private targetAccountIban!: string;
    private withdrawReference!: string;
    private splitAmount!: number;
    private vatMode!: boolean;
    private excludeInternalAccounts!: boolean;

    private withdrawalActions = new Map<string, { accountName: string, iban: string, amount: string }>();
    private transactions: Record<string, Partial<ProcessedTransaction>[]> = {};

    private currentDateTime = DateTime.now();

    @inject()
    public async prepare(qontoService: QontoService) {
        this.qontoService = qontoService;
        await this.defineConfig();

        this.processedTransaction = (await import('#models/processed_transaction')).default;

        const watchedAccount = (await import('#models/watched_account')).default
        this.watchedAccounts = await watchedAccount.all();

        const exclusion = (await import('#models/exclusion')).default;
        this.excludedAccounts.push(...await exclusion.all() ?? []);

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
            if (filteredTransactions.length <= 0) continue;

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
        table.head(['Account', 'Transaction ID', 'Reference', 'Amount', 'Split', 'Amount Split']);

        for (const [accountId, transactions] of Object.entries(this.transactions)) {
            const accountName = this.watchedAccounts.find(account => account.qonto_id === accountId)?.name!;
            const amountWithdrawal = transactions.reduce((sum, tx) => sum + tx.amountSplit!, 0);
            const debitIban = await this.qontoService.getAccountIban(accountId);

            for (const tx of transactions) {
                const description = tx.reference!.length <=0 ? tx.label! : tx.reference!;
                const truncatedReference = description.slice(0, 30);

                table.row([
                    accountName,
                    tx.transactionId!,
                    truncatedReference.length < tx.reference!.length ? `${truncatedReference}...` : truncatedReference,
                    tx.amount?.toFixed(2)!,
                    `${this.splitAmount * 100}%`,
                    tx.amountSplit?.toFixed(2)!
                ]);
            }

            if (amountWithdrawal > 0)
                this.withdrawalActions.set(accountId, {
                    accountName: accountName,
                    iban: debitIban,
                    amount: amountWithdrawal.toFixed(2)
                });
        }

        table.render();

        if (this.interactive && !await this.prompt.confirm('Do you want to proceed with the transactions ?')) {
            this.logger.warning('Aborted by user.');
            return await this.terminate();
        }

        for (const withdrawal of this.withdrawalActions.values()) {
            if (!this.dryRun) {
                const transfert = await this.qontoService.internalTransfer(
                    withdrawal.amount,
                    withdrawal.iban,
                    this.targetAccountIban,
                    this.withdrawReference
                );

                this.logger.info(`[${transfert.id}] Withdraw ${withdrawal.amount} from ${withdrawal.accountName} successfully.`);
            } else {
                this.logger.info(`[dry] Withdraw ${withdrawal.amount} from ${withdrawal.accountName} successfully.`);
            }
        }

        if (!this.dryRun)
            await this.processedTransaction.createMany(Object.values(this.transactions).flat());

        await this.terminate();
    }

    private async filterTransactions(transactions: Transaction[]) {
        const filtered = await Promise.all(
            transactions.map(async (tx) => {
                const processed = await this.processedTransaction.findBy('transaction_id', tx.id);
                if (processed) return null;

                const excludedMatches = await Promise.all(
                    this.excludedAccounts.map(async (exclusion) => {
                        return await hash.verify(exclusion.iban, tx.income?.counterparty_account_number ?? '');
                    })
                );

                if (excludedMatches.some(match => match)) return null;
                return tx;
            })
        );

        return filtered.filter((tx): tx is Transaction => tx !== null);
    }

    private computeSplitAmount(transaction: Transaction): number {
        const amount = this.vatMode
            ? transaction.amount - (transaction.amount / (this.splitAmount + 1))
            : transaction.amount * this.splitAmount;

        return Number(amount.toFixed(2));
    }

    private async defineConfig() {
        const config = (await import('#models/config')).default;

        this.withdrawReference = (await config.findBy('key', ConfigKey.WithdrawalReference))?.value!;
        const rawTargetAccount = (await config.findBy('key', ConfigKey.TargetAccount))?.value!;
        const rawSplitAmount = (await config.findBy('key', ConfigKey.SplitAmount))?.value!;
        const rawVatMode = (await config.findBy('key', ConfigKey.VatMode))?.value!;
        const rawExcludeInternalAccounts = (await config.findBy('key', ConfigKey.ExcludeInternalAccounts))?.value!;

        if (!this.withdrawReference || !rawTargetAccount || !rawVatMode || !rawExcludeInternalAccounts || !rawSplitAmount) {
            this.logger.error('Application not setup. Start the app with the qonto:setup command.');
            await this.terminate();
            return process.exit(1);
        }

        this.vatMode = Boolean(Number(rawVatMode));
        this.excludeInternalAccounts = Boolean(Number(rawExcludeInternalAccounts));
        this.splitAmount = Number(rawSplitAmount);

        const { organization } = await this.qontoService.organizationDetails();
        const bankAccounts = organization.bank_accounts;

        for (const account of bankAccounts) {
            if (account.id === rawTargetAccount)
                this.targetAccountIban = account.iban;

            if (this.excludeInternalAccounts)
                this.excludedAccounts.push({ name: account.name, iban: await hash.make(account.iban) } as Exclusion);
        }
    }
}
