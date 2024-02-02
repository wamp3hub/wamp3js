import { NewPending } from './pending'

export default function sleep(duration: number): Promise<void> {
    if (duration < 1) {
        return Promise.resolve()
    }

    let {promise, complete} = NewPending<void>()
    setTimeout(complete, duration)
    return promise
}
