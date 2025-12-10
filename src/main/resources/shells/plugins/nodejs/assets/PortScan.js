(function () {
    return {
        async run(ctx) {
            const net = await import("net");

            const ip = ctx.get("ip");
            const ports = ctx.get("ports");

            if (!ip || !ports || !ip.trim() || !ports.trim()) {
                return "ip or ports is null";
            }

            const host = ip.trim();
            const portList = ports.trim().split(",");

            function scanPort(ip, port) {
                return new Promise(resolve => {
                    const socket = new net.Socket();
                    socket.setTimeout(500);

                    socket.connect(Number(port), ip, () => {
                        socket.destroy();
                        resolve(true);
                    });

                    socket.on("error", () => resolve(false));

                    socket.on("timeout", () => {
                        socket.destroy();
                        resolve(false);
                    });
                });
            }

            const tasks = portList.map(port => {
                const p = port.trim();
                return scanPort(host, p).then(open => {
                    return `${host}\t${p}\t${open ? 1 : 0}\n`;
                });
            });

            const results = await Promise.all(tasks);
            return results.join("");
        }
    };
})()