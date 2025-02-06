import got from 'got';
import env from '#start/env';

import {
    OrganizationWrapper,
    TransactionQueryParameters,
    Transactions,
    TransferPayload,
    TransferResponse,
} from '#types/qonto';

export default class QontoService {
    private readonly httpClient = got.extend({
        prefixUrl: env.get('QONTO_API_BASE_URL'),
        headers: {
            'X-Qonto-Staging-Token': '',
            'Accept': 'application/json, text/plain',
            'Authorization': `${env.get('QONTO_ORGANIZATION_SLUG')}:${env.get('QONTO_SECRET_KEY')}`,
        },
    });

    public async organizationDetails(includeExternalAccounts = false) {
        try {
            return await this.httpClient
                .get('organization', {
                    searchParams: {
                        include_external_accounts: includeExternalAccounts,
                    },
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

    public async createInternalTransfer(payload: TransferPayload) {
        try {
            return this.httpClient
                .post<TransferPayload>('internal_transfer', {
                    // The API supports idempotency for safely retrying requests
                    // without accidentally performing the same operation twice.
                    headers: {
                        'X-Qonto-Idempotency-Key': '',
                    },
                    json: payload,
                })
                .json<TransferResponse>();
        } catch (err) {
            throw new Error(`Error while trying to create internal transfer: ${err}`);
        }
    }
}
