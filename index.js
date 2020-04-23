const Discord = require("discord.js");
const client = new Discord.Client;
const config = require("./config.json");
const mysqlx = require("@mysql/xdevapi");
const log4js = require("log4js");
var dbSession;

log4js.configure({
    appenders: {
        file: { type: "file", filename: "ldqueue.log" },
        out: { type: "stdout" }
    },
    categories: { default: { appenders: ["file", "out"], level: "debug" } }
});
const logger = log4js.getLogger();

client.once("ready", () => {
    mysqlx.getSession({
        user: config.dbUser,
        password: config.dbPassword,
        host: config.dbHost,
        port: config.dbPort,
        schema: config.dbSchema
    }).then(session => {
        dbSession = session;
    });
    logger.info("Ready!");
});

client.login(config.token);

function checkForEmpty() {
    return dbSession.sql("SELECT COUNT(*) FROM LDQueue").execute(row => {
        logger.debug(row[0]);
        if (row[0] > 0) {
            return 0;
        } else {
            return 1;
        }
    });
}

function getMin() {
    return dbSession.sql("SELECT MIN(QueuePosition) FROM LDQueue").execute(row => {
        return row[0];
    });
}

client.on("message", message => {
    if (message.content.startsWith(`${config.prefix}add`)) {
        var link = message.content.slice(5);
        dbSession.sql(`INSERT INTO LDQueue(QueueLink) VALUES("${link}")`).execute();
    }
    if (message.content.startsWith(`${config.prefix}next`)) {
        if (message.member.roles.cache.some(role => role.name === "LDer")) {
            var empty;
            empty = checkForEmpty();
            logger.debug(empty);
            logger.debug(checkForEmpty());
            if (empty > 0) {
                var min = getMin();
                dbSession.sql(`SELECT QueueLink FROM LDQueue WHERE QueuePosition=${min}`).execute(row => {
                    message.reply(`the next game is at ${row[0]}.`);
                });
            }
            else {
                message.reply("queue is empty.");
            }
        } else {
            message.reply("access denied.");
        }
    }
    if (message.content.startsWith(`${config.prefix}delete`)) {
        if (message.member.roles.cache.some(role => role.name === "LDer")) {
            var empty = checkForEmpty();
            if(empty === false) {
                var min = getMin();
                dbSession.sql(`DELETE FROM LDQueue WHERE QueuePosition=${min}`).execute();
            }
            else {
                message.reply("queue is empty.");
            }
        } else {
            message.reply("access denied.");
        }
    }
})