import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Exclusion from '#models/exclusion';

export default class extends BaseSeeder {
    async run() {
        await Exclusion.createMany([
            {
                iban: 'FR761695800001780944890758'
            },
            {
                iban: 'FR7616958000017809448907587'
            }
        ])
    }
}
