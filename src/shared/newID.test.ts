import {test} from 'vitest'
import NewID from "@shared/newID"


test('should generate unique IDs', () => {
    let idSet = new Set()
    for (let i = 0; i < 1000; i++) {
        let id = NewID()
        if (idSet.has(id)) {
            throw 'ID generator should return unique value'
        }
        idSet.add(id)
    }
})
