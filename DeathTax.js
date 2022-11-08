"use strict";
ll.registerPlugin("DeathTax", "死亡税", [1, 0, 0]);

const conf = new JsonConfigFile("plugins\\DeathTax\\config.json");
const tax = conf.init("tax", [0, 3]);
conf.close();
mc.listen("onPlayerDie", (pl) => {
    const level = pl.getLevel();
    if (level <= 0) return;
    const condition = Math.floor(tax[1] + tax[1] * level * 0.02);
    let reduce = Math.round(Math.random() * (tax[0] - condition) + condition);
    if (level < reduce) {
        reduce = level;
        pl.resetLevel();
    } else pl.reduceLevel(reduce);
    pl.tell(`扣除${reduce}级经验`);
});
