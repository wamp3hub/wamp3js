import wamp3js from '~/index'

async function main() {
    let wamps = await wamp3js.transports.WebsocketJoin('0.0.0.0:8800')

    // @ts-ignore
    window.wamps = wamps
}

main()