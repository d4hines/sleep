// adapted with much gratitude from
// https://github.com/nfarina/homebridge-eightsleep/blob/master/src/util/api.ts

import { config } from "dotenv";
import express from "express";
import fetch from "node-fetch";

config();
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;


type LoginResult = {
    session: {
        expirationDate: string; // Like "2019-02-16T07:02:13.446Z"
        userId: string; // Like "3aaa3142d7fc42048e5d8b215"
        token: string; // Like "d70e62b795384056b969e52ef17c305a-e1742f735e56cb2818fc6c454d945add"
    };
}

async function clientAPI<T>({
    method = "GET",
    path,
    body,
    token,
}: {
    method?: "GET" | "PUT" | "POST";
    path: string;
    body?: Object;
    token?: string;
}): Promise<any> {
    const url = `https://client-api.8slp.net/v1/${path}`;
    const response = await fetch(url, {
        method,
        ...(body ? { body: JSON.stringify(body) } : null),
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { "Session-Token": token } : null),
        },
    });

    if (!response.ok) {
        throw new Error(
            `Error from Eight Client API: ${response.status} ${response.statusText}`,
        );
    }

    return (await response.json()) as T;
}

async function appAPI({
    method = "GET",
    path,
    body,
    token,
}: {
    method?: "GET" | "PUT" | "POST";
    path: string;
    body?: Object;
    token?: string;
}): Promise<any> {
    const url = `https://app-api.8slp.net/v1/${path}`;
    const response = await fetch(url, {
        method,
        ...(body ? { body: JSON.stringify(body) } : null),
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : null),
        },
    });

    if (!response.ok) {
        throw new Error(
            `Error from Eight App API: ${response.status} ${response.statusText}`,
        );
    }

    return response.text();
}

async function login({
    email,
    password,
}: {
    email: string;
    password: string;
}): Promise<LoginResult> {
    return clientAPI<LoginResult>({
        method: "POST",
        path: "login",
        body: { email, password },
    });
}

async function getOAuthToken({ token }: { token: string }) {
    return clientAPI<any>({
        method: "POST",
        path: "users/oauth-token",
        body: { client_id: CLIENT_ID, client_secret: CLIENT_SECRET },
        token
    })
}

async function stopAlarm({ userId, token }: any) {
    return await appAPI({
        method: "PUT",
        path: `users/${userId}/alarms/active/stop`,
        token
    });
}

async function getActiveAlarm({ userId, token }: any) {
    return await appAPI({
        method: "GET",
        path: `users/${userId}/alarms/active`,
        token
    })
}

let loginData = {
    expirationDate: new Date(Date.now()),
    token: "",
    userId: ""
};

let bearerToken = "";

const app = express()
const port = process.env.PORT || 3000;

app.get('/stop', async (req : any, res: any) => {
    if (new Date(loginData.expirationDate) <= new Date(Date.now())) {
        console.log("Token expired. Logging in again.");

        const { session: { expirationDate, token, userId } } = await login({ email: EMAIL, password: PASSWORD } as any);
        loginData = { expirationDate: new Date(expirationDate), token, userId };
        bearerToken = (await getOAuthToken({ token: loginData.token })).access_token;
    }

    console.log("Fetching alarms.");
    const result = JSON.parse(await getActiveAlarm({ userId: loginData.userId, token: bearerToken }));
    console.log(JSON.stringify(result, null, 2));
    if (result.alarm) {
        console.log("Alarms found.");
        const results = await stopAlarm({ userId: loginData.userId, token: bearerToken });
        console.log(results);
        console.log("Alarms stopped.");
    } else {
        console.log("No alarms found.")
    }

    res.send('Alarm stopped')
})

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`)
})
