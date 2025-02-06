import { test } from '@japa/runner'

import Exclusion from '#models/exclusion'
import hash from '@adonisjs/core/services/hash'

test('should hash the iban when adding a new iban to the excluded list.', async ({ assert }) => {
    const exclusion = new Exclusion()
    exclusion.iban = 'FR3312739000308258528819Q90'

    await exclusion.save()

    assert.isTrue(hash.isValidHash(exclusion.iban))
    assert.isTrue(await hash.verify(exclusion.iban, 'FR3312739000308258528819Q90'))
})
