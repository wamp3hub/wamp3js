import {expect, test} from 'vitest'
import invalidURI from "~/shared/invalidURI"


test('should validate URI', () => {
    let validURIList = [
        'net.example',
    ]
    for (let v of validURIList) {
        expect(invalidURI(v)).toBe(false)
    }

    let invalidURIList = [
        'net.example-1',
    ]
    for (let v of invalidURIList) {
        expect(invalidURI(v)).toBe(true)
    }
})
