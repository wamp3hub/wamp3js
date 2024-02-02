import { type Pending, NewPending } from "./pending"

export class PendingNotFound extends Error {}

export type PendingMap<T> = {
    create(ID: string): Pending<T>
    complete(ID: string, value: T): void
}

export function NewPendingMap<T>(): PendingMap<T> {
    let pendingMap: Map<string, Pending<T>> = new Map()

    return {
        create(ID: string): Pending<T> {
            let pending = NewPending<T>()
            pendingMap.set(ID, pending)
            return pending
        },

        complete(ID: string, value: T) {
            let pending = pendingMap.get(ID)
            if (pending) {
                pendingMap.delete(ID)
                pending.complete(value)
            } else {
                throw new PendingNotFound()
            }
        }
    }
}
