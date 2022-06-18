"use strict";
ll.registerPlugin("HubInfo", "信息栏", [1, 0, 0]);

const db = new KVDatabase("plugins\\HubInfo\\data");
let ticks = [];
let realTPMS = 0;
let newTick = Date.now();
let next = {};
mc.listen("onTick", () => {
    let oldTick = newTick;
    newTick = Date.now();
    ticks.push(newTick - oldTick);
});
setInterval(() => {
    let tickPlus = 0;
    for (let tick of ticks) tickPlus += tick;
    realTPMS = tickPlus / ticks.length;
    ticks = [];
    let tps = 1000 / realTPMS;
    let pls = mc.getOnlinePlayers();
    for (let pl of pls) {
        pl.removeSidebar();
        pl.removeBossBar();
        let pldv = pl.getDevice();
        let list = {};
        list[
            `负载：§${
                tps > 18
                    ? "a"
                    : tps > 14
                    ? "e"
                    : tps > 9
                    ? "c"
                    : tps > 5
                    ? "4"
                    : 0
            }${Math.abs(Math.floor(100 - tps / 0.2))}％§r（${
                tps == Math.round(tps) ? "" : "~"
            }${Math.round(tps)}刻/秒）`
        ] = 0;
        list[
            `延迟：§${
                pldv.avgPing < 30
                    ? "a"
                    : pldv.avgPing < 50
                    ? "e"
                    : pldv.avgPing < 100
                    ? "c"
                    : pldv.avgPing < 200
                    ? "4"
                    : pldv.avgPing < 500
                    ? 0
                    : "b"
            }${pldv.avgPing}§r毫秒 §${pldv.avgPacketLoss > 1 ? "c" : "a"}${
                pldv.avgPacketLoss
            }％§r丢包`
        ] = 0;
        let state = db.get(pl.xuid);
        switch (state) {
            case 0:
                continue;
            case 1:
                pl.setSidebar(
                    `${pl.realName}在§${
                        "1234567890abcdefglmno"[Math.floor(Math.random() * 21)]
                    }源域`,
                    list
                );
                break;
            case 2:
                list[
                    `${pl.realName}在§${
                        "1234567890abcdefglmno"[Math.floor(Math.random() * 21)]
                    }源域`
                ] = 0;
                let step = 25;
                if (!(pl in next)) {
                    next[pl] = -step;
                }
                let index = Math.floor(
                    (next[pl] = next[pl] < 300 - step ? next[pl] + step : 0) /
                        100
                );
                pl.setBossBar(Object.keys(list)[index], next[pl] % 100, index);
                break;
        }
    }
}, 1000);
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand("hubinfo", "信息栏设置。", PermType.Any);
    cmd.optional("player", ParamType.Player);
    cmd.overload("player");
    cmd.setCallback((_, ori, out, res) => {
        if ((!ori.player || ori.player.isOP()) && res.player) {
            if (res.player.length < 1) {
                out.error("commands.generic.noTargetMatch");
                return;
            }
            for (let pl of res.player) {
                setup(pl);
            }
            return;
        }
        if (!ori.player) {
            out.error("commands.generic.noTargetMatch");
            return;
        }
        setup(ori.player);
    });
    cmd.setup();
});
function setup(pl) {
    let fm = mc.newCustomForm();
    fm.setTitle("信息栏 - 设置");
    fm.addStepSlider("位置", ["关闭", "计分板", "血条"], db.get(pl.xuid) ?? 0);
    pl.sendForm(fm, (_, args) => {
        if (!args) return;
        if (args[0] == db.get(pl.xuid)) return;
        db.set(pl.xuid, args[0]);
        pl.tell("修改成功");
    });
}
