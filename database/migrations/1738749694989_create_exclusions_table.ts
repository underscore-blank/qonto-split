import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'exclusions';

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id').primary();

            table.string('name').notNullable();
            table.string('iban').notNullable().unique();

            table.timestamps(true, true);
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
