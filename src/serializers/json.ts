import * as domain from '@domain'

export default function JSONSerializer() {
    return {
        encode(data: domain.Event): string {
            return JSON.stringify(data)
        },

        decode(message: string): domain.Event {
            return JSON.parse(message)
        },
    }
}
