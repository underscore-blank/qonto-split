import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'watched_accounts'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id').primary();

            table.string('name').notNullable();
            table.string('qonto_id').notNullable().unique();

            table.timestamps(true, true);
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
