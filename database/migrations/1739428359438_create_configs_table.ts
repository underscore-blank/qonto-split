import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'configs'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id').primary();

            table.string('key').unique().notNullable();
            table.string('value').notNullable();

            table.timestamps(true);
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
