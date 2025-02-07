import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'processed_transactions';

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id');

            table.string('transaction_id').notNullable().unique();
            table.integer('amount').notNullable();
            table.string('reference').nullable();
            table.string('label').nullable();
            table.integer('amount_split').nullable();

            table.timestamps(true, true);
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
