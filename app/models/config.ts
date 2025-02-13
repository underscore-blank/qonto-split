import { DateTime } from 'luxon'
import { BaseModel, afterFind, beforeSave, column } from '@adonisjs/lucid/orm'

import encryption from '@adonisjs/core/services/encryption'

export enum ConfigKey {
    TargetAccount = 'target_account',
    WithdrawalReference = 'withdrawal_reference',
    VatMode = 'vat_mode',
    ExcludeInternalAccounts = 'exclude_internal_accounts',
    SplitAmount = 'split_amount',
}

export default class Config extends BaseModel {
    @column({ isPrimary: true })
    declare id: number

    @column()
    declare key: ConfigKey

    @column()
    declare value: string

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @beforeSave()
    static async cryptValue(config: Config) {
        if (config.$dirty.value) {
            config.value = encryption.encrypt(config.value)
        }
    }

    @afterFind()
    static async decryptValue(config: Config) {
        config.value = encryption.decrypt(config.value)!
    }
}
