import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'processed_transactions'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id')

            table.string('transaction_id').notNullable().unique()
            table.string('amount').notNullable()

            table.timestamp('created_at')
            table.timestamp('updated_at')
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}

// TODO: amount, reference, label, amount_split