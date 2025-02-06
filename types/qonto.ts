export interface Pagination {
    current_page: number
    next_page: any
    prev_page: any
    total_pages: number
    total_count: number
    per_page: number
}

export interface BankAccount {
    /**
     * UUID of the bank account.
     */
    id: string
    /**
     * Slug of the bank account based on the organ's slug.
     */
    slug: string
    /**
     * Might be empty for external accounts
     */
    iban: string
    /**
     * Might be empty for external accounts
     */
    bic: string
    /**
     * Currency of the bank account.
     */
    currency: string
    /**
     * Actual amount of money on the account, in euros.
     */
    balance: number
    /**
     * Actual amount of money on the account, in euros.
     */
    balance_cents: number
    /**
     * Amount available for payments, taking into account transactions that are being processed.
     */
    authorized_balance: number
    /**
     * Amount available for payments, taking into account transactions that are being processed.
     */
    authorized_balance_cents: number
    /**
     * Name of the bank account.
     */
    name: string
    /**
     * Date and time, in UTC, of the last update of the bank account.
     */
    updated_at: string
    /**
     * Status of the bank account.
     */
    status: 'active' | 'closed'
    /**
     * Sets to {true} if the bank account is used for billing. There is only one main account in a given organization.
     */
    main: boolean
    /**
     * Sets to true if the bank account is not a Qonto account.
     */
    is_external_account: boolean
    /**
     * Might be empty for Qonto accounts.
     */
    account_number: string | number
}

export interface OrganizationWrapper {
    organization: Organization;
}

export interface Organization {
    /**
     * UUID of the organization.
     */
    id: string
    /**
     * Name of the organization.
     */
    name: string
    /**
     * Slug based on organization's legal name.
     */
    slug: string
    /**
     * Registered name of the organization.
     */
    legal_name: string | null
    /**
     * Default language set for the organization.
     */
    locale: string
    /**
     * Informed share capital, expressed in euros.
     */
    legal_share_capital: number
    /**
     * Country of incorporation of the organization.
     */
    legal_country: string
    /**
     * Date of incorporation of the organization.
     */
    legal_registration_date: string | null
    /**
     * Legal formation of the organization.
     */
    legal_form: string
    /**
     * Address of the organization.
     */
    legal_address: string
    /**
     * Code of the organization's activity sector.
     */
    legal_sector: string | null
    /**
     * Date and time, in UTC, the account was opened.
     */
    contract_signed_at: string
    /**
     * Unique number of registration (e.g.: SIRET in France).
     */
    legal_number: string
    bank_accounts: BankAccount[]
}

export interface Transaction {
    /**
     * UUID of the transaction.
     */
    id: string
    transaction_id: string
    /**
     * Amount of the transaction in the currency of the bank account.
     */
    amount: number
    /**
     * Amount of the transaction in the currency of the bank account.
     */
    amount_cents: number
    settled_balance: number | null
    /**
     * @defaultValue 0
     */
    settled_balance_cent: number | null
    /**
     * Array of UUIDs, corresponding to the attachments (up to 5) uploaded on the transaction.
     */
    attachment_ids: (string | null)[]
    /**
     * Object containing URLs to small and medium-sized logos associated with the transaction.
     */
    logo: {
        small: string
        medium: string
    }
    /**
     * Amount of the transaction in the foreign currency (if any).
     */
    local_amount: number
    /**
     * Amount of the transaction in the foreign currency (if any).
     */
    local_amount_cents: number
    side: 'debit' | 'credit'
    operation_type:
        | 'income'
        | 'transfer'
        | 'card'
        | 'direct_debit'
        | 'direct_debit_collection'
        | 'direct_debit_hold'
        | 'qonto_fee'
        | 'cheque'
        | 'recall'
        | 'swift_income'
        | 'pay_later'
        | 'financing_installment'
        | 'other'
    /**
     * "euros" is the only bank account currency supported by Qonto.
     */
    currency: string
    local_currency: string
    /**
     * Name of the counterparty of the transaction.
     */
    label: string
    /**
     * Simplified and standardized version of the counterparty's name.
     */
    clean_counterparty_name: string
    /**
     * Date and time, in UTC, at which the transaction was finally committed to the account, and got set to a "completed" status.
     */
    settled_at: string | null
    /**
     * Date and time, in UTC, at which the transaction was first authorized and recorded on the bank account.
     */
    emitted_at: string
    /**
     * Date and time, in UTC, at which the transaction object was last updated (any state change will trigger a bump of this timestamp).
     */
    updated_at: string
    status: 'completed'
    note: string | null
    reference: string | null
    /**
     * Amount aggregate for all the VAT.
     */
    vat_amount: number | null
    /**
     * Amount aggregate for all the VAT.
     */
    vat_amount_cents: number | null
    vat_rate: number | null
    initiator_id: null
    /**
     * {id} of the custom label that user can add on a transaction for categorization purposes.
     */
    label_ids: (string | null)[]
    attachment_lost: boolean
    attachment_required: boolean
    card_last_digits: null
    category: 'subscription'
    subject_type: {}
    bank_account_id: string
    /**
     * Sets to {true} for transactions related to external bank accounts
     */
    is_external_transaction: boolean
    /**
     * Use the following parameter to include {attachments} in the response
     */
    attachments:
        | {
              id: string
              created_at: string
              file_name: string
              file_size: string
              file_content_type: string
              url: string
              probative_attachment: {
                  status: string
              }
          }[]
        | null
    /**
     * Use the following parameter to include {labels} in the response
     */
    labels:
        | {
              id: string
              name: string
              parent_id: string
          }[]
        | null
    /**
     * Use the following parameter to include {vat_details} in the response
     */
    vat_details: {
        items: {
            amount: string
            amount_cents: string
            amount_excluding_vat: string
            amount_excluding_vat_cents: string
            rate: string
        }[]
    }
    transfer: {
        counterparty_account_number: string
        counterparty_amount_number_format: string
        counterparty_bank_identifier: string
        counterparty_bank_identifier_format: string
    } | null
    income: {
        counterparty_account_number: string
        counterparty_amount_number_format: string
        counterparty_bank_identifier: string
        counterparty_bank_identifier_format: string
    } | null
    swift_income: {
        counterparty_account_number: string
        counterparty_amount_number_format: string
        counterparty_bank_identifier: string
        counterparty_bank_identifier_format: string
    } | null
    direct_debit: {
        counterparty_account_number: string
        counterparty_amount_number_format: string
        counterparty_bank_identifier: string
        counterparty_bank_identifier_format: string
    } | null
    check: {
        check_number: string
        check_key: string
    } | null
    financing_installment: {
        total_installments_number: string
        current_installment_number: string
    } | null
    pagopa_payment: {
        notice_number: string
        creditor_fiscal_code: string
        iuv: string
    } | null
    direct_debit_collection: {
        counterparty_account_number: string
        counterparty_amount_number_format: string
        counterparty_bank_identifier: string
        counterparty_bank_identifier_format: string
    } | null
    direct_debit_hold: {
        guarding_rate: string
    } | null
}

export interface Transactions extends Pagination {
    transactions: Transaction[]
    meta: Pagination
}

export interface TransactionQueryParameters {
    [key: string]: string

    bank_account_id: string

    emitted_at_from: string
    emitted_at_to: string

    iban: string

    'includes[]': 'vat_details' | 'labels' | 'attachments'
    'operation_type[]': 'card' | 'transfer' | 'income'

    settled_at_from: string
    settled_at_to: string

    side: 'debit' | 'credit'

    sort_by: 'updated_at' | 'settled_at' | 'emitted-at' | 'asc' | 'desc'
    'status[]': 'pending' | 'declined' | 'completed'

    updated_at_from: string
    updated_at_to: string

    with_attachments: 'true' | 'false'
}

export interface TransferPayload {
    internal_transfer: {
        debit_iban: string
        credit_iban: string
        reference: string
        amount: string
        currency: string
    }
}

export interface TransferResponse {
    /**
     * Transfer id
     */
    id: string
    /**
     * Transfer slug
     */
    slug: string
    /**
     * Transfer status (always pending)
     */
    status: 'pending'
    /**
     * Transfer amount
     */
    amount: number
    /**
     * Transfer amount in cents
     */
    amount_cents: number
    /**
     * Transfer currency (EUR only)
     */
    currency: string
    /**
     * Transfer reference
     */
    reference: string
    /**
     * Transfer creation time
     */
    created_at: string
}
