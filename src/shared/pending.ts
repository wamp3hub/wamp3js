export type Completable<T> = (value: T) => void

export type Cancellable = (reason?: any) => void

export type Pending<T> = {
    promise: Promise<T>
    complete: Completable<T>
    cancel: Cancellable
}

export function NewPending<T=any>(): Pending<T> {
    let complete,
        cancel,
        promise = new Promise<T>(
            (promiseResolve, promiseReject) => {
                complete = promiseResolve
                cancel = promiseReject
            }
        )

    // ~/ts-ignore
    return {promise, complete, cancel}
}
