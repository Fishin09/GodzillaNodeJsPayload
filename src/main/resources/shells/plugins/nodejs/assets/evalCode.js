(function () {
    return {
        async run(ctx) {
            return eval(ctx.get("plugin_eval_code"))
        }
    };
})()