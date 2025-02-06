import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class ProcessedTransaction extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare transactionId: string;

    @column()
    declare amount: string;

    @column()
    declare reference: string | null;

    @column()
    declare label: string | null;

    @column()
    declare amountSplit: string | null;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime
}
