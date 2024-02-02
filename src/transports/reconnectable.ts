import * as domain from '~/domain'
import * as peer from '~/peer'
import {NewLocker} from '~/shared/locker'
import {RetryStrategy, DefaultRetryStrategy} from '~/shared/retryStrategy'
import sleep from '~/shared/sleep'

export class BadConnection extends Error {}

export async function makeReconnectable(
    connect: () => Promise<peer.Transport>,
    strategy: RetryStrategy = DefaultRetryStrategy,
): Promise<peer.Transport> {
    let reading = NewLocker()
    let writing = NewLocker()
    let transport: peer.Transport

    async function pause() {
        await writing.lock()
        await reading.lock()
        console.debug('pause io')
    }

    function resume() {
        reading.unlock()
        writing.unlock()
        console.debug('resume io')
    }

    async function close() {
        await transport.close()
    }

    async function reconnect() {
        if (strategy.attemptNumber == 0) {
            await pause()
        }

        let sleepDuration = strategy.next()
        if (sleepDuration > 0) {
            try {
                console.debug(`waiting ${sleepDuration} seconds to reconnect`)
                await sleep(sleepDuration * 1000)
            } catch {
                throw new peer.ConnectionClosed()
            }
        }

        try {
            console.debug('connecting...')
            let newTransport = await connect()

            if (transport === undefined) {
                try {
                    await close()
                    console.debug("broken transport successfully closed")
                } catch (e) {
                    console.warn('during close broken transport', e)
                }
            }

            transport = newTransport

            strategy.reset()
            resume()
            console.debug('successfully connected')
        } catch (e) {
            console.error('during connect', e)
            await reconnect()
        }
    }

    async function safeRead() {
        await reading.lock()
        try {
            return await transport.read()
        } finally {
            reading.unlock()
        }
    }

    async function read() {
        try {
            return await safeRead()
        } catch (e) {
            if (e instanceof BadConnection) {
                await reconnect()
                throw new peer.ConnectionRestored()
            }
            throw e
        }
    }

    async function safeWrite(event: domain.Event) {
        await writing.lock()
        try {
            await transport.write(event)
        } finally {
            writing.unlock()
        }
    }

    await reconnect()

    return {
        read,
        write: safeWrite,
        close,
    }
}
