// adapted with much gratitude from
// https://github.com/nfarina/homebridge-eightsleep/blob/master/src/util/api.ts

require("dotenv").config();

const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

const API_URL = "https://client-api.8slp.net/v1";

type LoginResult = {
    session: {
        expirationDate: string; // Like "2019-02-16T07:02:13.446Z"
        userId: string; // Like "3aaa3142d7fc42048e5d8b215"
        token: string; // Like "d70e62b795384056b969e52ef17c305a-e1742f735e56cb2818fc6c454d945add"
    };
}


async function api<T>({
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
    const url = API_URL + "/" + path;

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
            `Error from Eight API: ${response.status} ${response.statusText}`,
        );
    }

    return (await response.json()) as T;
}

async function login({
    email,
    password,
}: {
    email: string;
    password: string;
}): Promise<LoginResult> {
    return await api<LoginResult>({
        method: "POST",
        path: "login",
        body: { email, password },
    });
}

async function stopAlarm({user, token}) {
    return await api<any>({
        method: "PUT",
        path: `users/${user}/alarms/active/stop`,
        token
    });
}

let loginData = {
    expirationDate: undefined,
    token: undefined,
    userId: undefined
};

(async () => {
    if (new Date(loginData.expirationDate).getSeconds() <= Date.now()) {

    }
    const { session: { expirationDate, token, userId } } = await login({ email: EMAIL, password: PASSWORD } as any);
    console.log({ expirationDate, token, userId });
    console.log(new Date(expirationDate));
})()
