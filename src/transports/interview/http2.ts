type SuccessPayload = {
    routerID: string
    ticket: string
    yourID: string
}

export default async function HTTP2Interview(
    address: string,
    secure: boolean,
    credentials: any,
): Promise<SuccessPayload> {
    let protocol = 'http'
    if (secure) {
        protocol = 'https'
    }
    let url = `${protocol}://${address}/wamp/v1/interview`
    console.debug(`http2interview ${url}`)
    let response = await fetch(
        url,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify(credentials),
        },
    )
    if (response.status == 200) {
        return await response.json()
    }
    throw 'SomethingWentWrong'
}
