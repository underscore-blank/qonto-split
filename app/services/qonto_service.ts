import got from 'got';
import env from '#start/env';

import * as crypto from 'node:crypto';

import { OrganizationWrapper, TransactionQueryParameters, Transactions, TransferResponse } from '#types/qonto';

export default class QontoService {
    private readonly apiVersion = 'v2';

    private readonly httpClient = got.extend({
        prefixUrl: `${env.get('QONTO_API_BASE_URL')}${this.apiVersion}/`,
        headers: {
            'X-Qonto-Staging-Token': '',
            'Accept': 'application/json, text/plain',
            'Authorization': `${env.get('QONTO_ORGANIZATION_SLUG')}:${env.get('QONTO_SECRET_KEY')}`
        }
    });

    public async getAccountIban(accountId: string) {
        try {
            const { organization } = await this.organizationDetails();
            const accounts = organization.bank_accounts;
            const account = accounts.find(acc => acc.id === accountId);
            return account!.iban;
        } catch (err) {
            throw new Error(`Error retrieving IBAN for account ${accountId}: ${err}`);
        }
    }

    public async organizationDetails(includeExternalAccounts = false) {
        try {
            return await this.httpClient
                .get('organization', {
                    searchParams: {
                        include_external_accounts: includeExternalAccounts
                    }
                })
                .json<OrganizationWrapper>();
        } catch (err) {
            throw new Error(`Error while trying to see organization details: ${err}`);
        }
    }

    public async listTransactions(queryParams?: Partial<TransactionQueryParameters>) {
        try {
            return await this.httpClient
                .get('transactions', { searchParams: queryParams })
                .json<Transactions>();
        } catch (err) {
            throw new Error(`Error while trying to list transactions: ${err}`);
        }
    }

    public async internalTransfer(
        amount: string | number,
        debitIban: string,
        creditIban: string,
        reference: string
    ) {
        try {
            return this.httpClient
                .post('internal_transfer', {
                    // The API supports idempotency for safely retrying requests
                    // without accidentally performing the same operation twice.
                    headers: {
                        'X-Qonto-Idempotency-Key': crypto.randomUUID(),
                        'Content-Type': 'application/json'
                    },
                    json: {
                        internal_transfer: {
                            debit_iban: debitIban,
                            credit_iban: creditIban,
                            reference: reference,
                            amount: amount.toString(),
                            currency: 'EUR'
                        }
                    }
                })
                .json<TransferResponse>();
        } catch (err) {
            throw new Error(`Error while trying to create internal transfer: ${err}`);
        }
    }
}
