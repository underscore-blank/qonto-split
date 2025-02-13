module.exports = {
    apps: [
        {
            name: "qonto-split",
            cwd: "./",
            script: "ace.js",
            args: ["scheduler:run"],
            interpreter: "node",
            exec_mode: "fork",
            instances: 1,
            autorestart: true,
            watch: false,
            time: true
        }
    ]
};
