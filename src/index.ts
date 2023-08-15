import * as wamp from "./wamp"
import { v4 as uuid4 } from 'uuid'


interface User {
    id: string
    name: string
    phone: string
}


async function main() {
    const session = wamp.WAMPSession('ws://0.0.0.0:9003/wamp3')
    window.wamp = session

    await session.join()

    await session.register(
        'user.create',
        async (callEvent) => {
            let user = {...callEvent.payload, id: uuid4()}
            console.log('created user', user)
            await session.publish({URI: 'user.new', include: [], exclude: []}, user)
            return user
        },
    )

    await session.subscribe(
        'user.new',
        (publishEvent) => console.log(`new user ${publishEvent.payload}`),
    )

    let result = await session.call<User>(
        {URI: 'user.create'},
        {name: 'aidar', phone: '77089057985'}
    )
    console.log('reply user.create', result)
}


main()

