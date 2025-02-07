/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
    NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
    PORT: Env.schema.number(),
    APP_KEY: Env.schema.string(),
    HOST: Env.schema.string({ format: 'host' }),
    LOG_LEVEL: Env.schema.string(),

    QONTO_API_BASE_URL: Env.schema.string(),
    QONTO_SECRET_KEY: Env.schema.string(),
    QONTO_ORGANIZATION_SLUG: Env.schema.string(),
    QONTO_WATCH_ACCOUNTS_IDS: Env.schema.string(),
    QONTO_TARGET_ACCOUNT_IBAN: Env.schema.string(),

    SPLIT_AMOUNT_PERCENT: Env.schema.number(),
    VAT_MODE: Env.schema.boolean(),
    EXCLUDE_INTERNAL_ACCOUNT: Env.schema.boolean(),
})
