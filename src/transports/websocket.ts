import type * as domain from '~/domain'
import type { Session } from '~/session'

import * as peer from '~/peer'
import { NewSession } from '~/session'
import {DefaultSerializer} from '~/serializers'
import HTTP2Interview from '~/transports/interview'
import NewQueue from '~/shared/queue'


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

export type WebsocketJoinOptions = {
    address: string
    credentials: any
    secure?: boolean
    serializer?: peer.Serializer
}

export async function Join(
    options: WebsocketJoinOptions
): Promise<Session> {
    if (!options.secure) {
        options.secure = false
    }
    if (!options.serializer) {
        options.serializer = DefaultSerializer
    }
    let payload = await HTTP2Interview(options.address, options.secure, options.credentials)
    let transport = await Connect(options.address, options.secure, options.serializer, payload.ticket)
    let __peer = peer.SpawnPeer(payload.yourID, transport)
    let session = NewSession(__peer)
    return session
}
