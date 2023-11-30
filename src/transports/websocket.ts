import * as domain from '@domain'
import * as peer from '@peer'
import { NewSession } from '@session'
import HTTP2Interview from '@transports/interview/http2'
import NewQueue from '@shared/queue'


export function Connect(
    address: string,
    secure: boolean,
    serializer: peer.Serializer,
    ticket: string,
): Promise<peer.Transport> {
    return new Promise((resolve, reject) => {
        let protocol = 'ws'
        if (secure) {
            protocol = 'wss'
        }
        let url = `${protocol}://${address}/wamp/v1/websocket?ticket=${ticket}`
    
        console.debug(`trying to websocket connect ${url}`)
    
        let q = NewQueue<string>()

        let connection = new WebSocket(url)

        async function read(): Promise<domain.Event> {
            let message = await q.pop()
            let event = serializer.decode(message)
            return event
        }

        async function write(event: domain.Event) {
            let message = serializer.encode(event)
            connection.send(message)
        }

        async function close() {
            connection.close()
        }

        connection.onopen = event => {
            console.debug('ws connection open', event)
            resolve({read, write, close,})
        }

        connection.onclose = event => {
            console.debug('ws connection close', event)
            reject(event)
        }

        connection.onmessage = async (message) => {
            await q.put(message.data)
        }

        connection.onerror = event => {
            console.error(event)
        }
    })
}

export async function Join(
    address: string,
    secure: boolean,
    credentials: any,
    serializer: peer.Serializer,
) {
    let payload = await HTTP2Interview(address, secure, credentials)
    let transport = await Connect(address, secure, serializer, payload.ticket)
    let __peer = peer.SpawnPeer(payload.yourID, transport)
    let session = NewSession(__peer)
    return session
}
