import { DateTime } from 'luxon';
import { BaseModel, beforeSave, column } from '@adonisjs/lucid/orm';

import hash from '@adonisjs/core/services/hash';

export default class Exclusion extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare name: string | null;

    @column()
    declare iban: string;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @beforeSave()
    static async hashIban(exclusion: Exclusion) {
        if (exclusion.$dirty.iban) {
            exclusion.iban = await hash.make(exclusion.iban);
        }
    }
}
