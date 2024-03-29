/*
English:
    Bazaar
    Copyright (C) 2023  Hosiyume starsdream00@icloud.com

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

中文：
    物品集市
    版权所有 © 2023  予纾 starsdream00@icloud.com
    本程序是自由软件：你可以根据自由软件基金会发布的GNU Affero通用公共许可证的条款，即许可证的第3版，
    或（您选择的）任何后来的版本重新发布和/或修改它。

    本程序的分发是希望它能发挥价值，但没有做任何保证；甚至没有隐含的适销对路或适合某一特定目的的保证。
    更多细节请参见GNU Affero通用公共许可证。

    您应该已经收到了一份GNU Affero通用公共许可证的副本。如果没有，
    请参阅<https://www.gnu.org/licenses/>（<https://www.gnu.org/licenses/agpl-3.0.html>）
    及其非官方中文翻译<https://www.chinasona.org/gnu/agpl-3.0-cn.html>。
*/

"use strict";
ll.registerPlugin("Bazaar", "物品集市", [1, 2, 6]);

const config = new JsonConfigFile("plugins/Bazaar/config.json");
const command = config.init("command", "bazaar");
const initialFunding = config.init("initialFunding", 7);
const serviceCharge = config.init("serviceCharge", 0.02);
const currencyType = config.init("currencyType", "llmoney");
const currencyName = config.init("currencyName", "元");
const eco = (() => {
    switch (currencyType) {
        case "llmoney":
            return {
                add: (pl, money) => pl.addMoney(money),
                reduce: (pl, money) => pl.reduceMoney(money),
                get: (pl) => pl.getMoney(),
                name: currencyName,
            };
        case "scoreboard":
            const scoreboard = config.init("scoreboard", "money");
            return {
                add: (pl, money) => pl.addScore(scoreboard, money),
                reduce: (pl, money) => pl.reduceScore(scoreboard, money),
                get: (pl) => pl.getScore(scoreboard),
                name: currencyName,
            };
        case "exp":
            return {
                add: (pl, money) => pl.addExperience(money),
                reduce: (pl, money, isLv) =>
                    isLv ? pl.reduceLevel(money) : pl.reduceExperience(money),
                get: (pl) => pl.getTotalExperience(),
                name: "经验值",
            };
    }
})();
config.close();
const db = new KVDatabase("plugins/Bazaar/data");
const cmd = mc.newCommand(command, "打开物品集市。", PermType.Any);
cmd.overload();
cmd.setCallback((_cmd, ori, out, _res) => {
    if (ori.player) return main(ori.player);
    return out.error("commands.generic.noTargetMatch");
});
cmd.setup();
mc.listen("onJoin", (pl) => {
    const shop = db.get(pl.xuid);
    if (!shop || shop.pending.length <= 0) return;
    while (shop.pending.length > 0) {
        const history = shop.pending.shift();
        const get = Math.round(
            history.count * history.item.price * (1 - history.serviceCharge)
        );
        eco.add(pl, get);
        shop.history.push(history);
        pl.tell(
            `${data.xuid2name(history.buyer)}于${history.time}购买了${
                history.item.name
            }§r*${history.count}（您获得了${get}${eco.name}）`
        );
    }
    db.set(pl.xuid, shop);
});
function main(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("物品集市");
    const list = [];
    const ownShop = db.get(pl.xuid);
    fm.addButton(ownShop ? "店铺管理" : "创建店铺");
    for (const owner of db.listKey()) {
        if (owner == pl.xuid) continue;
        const shop = db.get(owner);
        if (Object.keys(shop.items).length <= 0) continue;
        else list.push(owner);
        fm.addButton(`${shop.name}§r\n店主：${data.xuid2name(owner)}`);
    }
    fm.setContent(
        `共有${
            list.length +
            (db.get(pl.xuid) && Object.keys(ownShop.items).length <= 0 ? 0 : 1)
        }个店铺在线`
    );
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) return;
        switch (arg) {
            case 0:
                if (db.get(pl.xuid)) return shopManagement(pl);
                if (eco.get(pl) < initialFunding)
                    return pl.tell(
                        `§c店铺创建失败：余额不足（需要${initialFunding}${eco.name}）`
                    );
                return createShop(pl);
            default:
                itemList(pl, list[arg - 1]);
        }
    });
}
function createShop(pl) {
    const fm = mc.newCustomForm();
    fm.setTitle("创建店铺");
    if (initialFunding > 0)
        fm.addLabel(
            `将花费${initialFunding}${
                currencyType == "exp" ? "级经验" : eco.name
            }`
        );
    fm.addInput("名称", "字符串（可空）");
    fm.addInput("简介", "字符串（可空）");
    pl.sendForm(fm, (pl, args) => {
        if (!args) return main(pl);
        if (eco.get(pl) < initialFunding) {
            pl.tell(
                `§c店铺${args[1]}创建失败：余额不足（需要${initialFunding}${eco.name}）`
            );
            return main(pl);
        }
        eco.reduce(pl, initialFunding, true);
        db.set(pl.xuid, {
            owner: pl.xuid,
            guid: system.randomGuid(),
            name: args[1],
            intro: args[2],
            items: {},
            history: [],
            pending: [],
        });
        pl.tell(`店铺${args[1]}创建成功`);
        main(pl);
    });
}
function shopManagement(pl) {
    const fm = mc.newSimpleForm();
    const shop = db.get(pl.xuid);
    fm.setTitle("店铺管理");
    fm.setContent(
        serviceCharge > 0 ? `当前税率：${serviceCharge * 100}％` : ""
    );
    fm.addButton("信息设置");
    fm.addButton(`物品管理\n货架上共有${Object.keys(shop.items).length}个商品`);
    fm.addButton(
        `查看历史纪录\n共有${shop.history.length + shop.pending.length}条`
    );
    pl.sendForm(fm, (pl, arg) => {
        switch (arg) {
            case 0:
                return shopInfo(pl);
            case 1:
                return shopItemsManagement(pl);
            case 2:
                return shopHistroy(pl);
            default:
                main(pl);
        }
    });
}
function itemList(pl, owner) {
    const fm = mc.newSimpleForm();
    const shop = db.get(owner);
    const items = Object.values(shop.items);
    fm.setTitle(shop.name);
    fm.setContent(`${shop.intro}§r\n货架上共有${items.length}个物品`);
    const guids = [];
    if (items.length > 0)
        for (const item of items) {
            if (!item.snbt) continue;
            const itemNBT = NBT.parseSNBT(item.snbt);
            fm.addButton(
                `${item.name}§r（${itemNBT.getTag("Name")}）*${itemNBT.getTag(
                    "Count"
                )}\n价格：${item.price}${eco.name}/个`
            );
            guids.push(item.guid);
        }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) return main(pl);
        const item = db.get(owner).items[guids[arg]];
        if (!item.guid) {
            pl.tell(`§c${items[arg].name}§r购买失败：已被买走`);
            return itemList(pl, owner);
        }
        const canBuyMin = Math.round(eco.get(pl) / item.price);
        if (canBuyMin <= 0) {
            pl.tell(`§c${item.name}§r购买失败：余额不足`);
            return itemList(pl, owner);
        }
        itemBuy(pl, owner, item);
    });
}
function shopInfo(pl) {
    const fm = mc.newCustomForm();
    fm.setTitle("信息设置");
    const shop = db.get(pl.xuid);
    fm.addInput("名称", "字符串（可空）", shop.name);
    fm.addInput("简介", "字符串（可空）", shop.intro);
    pl.sendForm(fm, (pl, args) => {
        if (!args) return shopManagement(pl);
        shop.name = args[0];
        shop.intro = args[1];
        db.set(pl.xuid, shop);
        pl.tell(`店铺${args[0]}信息修改成功`);
        shopManagement(pl);
    });
}
function shopItemsManagement(pl) {
    const fm = mc.newSimpleForm();
    fm.addButton("上架物品");
    const shop = db.get(pl.xuid);
    fm.setTitle("物品管理");
    const guids = [];
    for (const item of Object.values(shop.items)) {
        if (!item.snbt) continue;
        const itemNBT = NBT.parseSNBT(item.snbt);
        fm.addButton(
            `${item.name}§r（${itemNBT.getTag("Name")}）*${itemNBT.getTag(
                "Count"
            )}\n价格：${item.price}${eco.name}/个`
        );
        guids.push(item.guid);
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) return shopManagement(pl);
        switch (arg) {
            case 0:
                const itemsmsg = [];
                const items = [];
                const inventoryItems = pl.getInventory().getAllItems();
                for (const item of inventoryItems) {
                    if (item.isNull()) continue;
                    itemsmsg.push(
                        `[${inventoryItems.indexOf(item)}]${item.name}§r（${
                            item.type
                        }:${item.aux}）*${item.count}`
                    );
                    items.push(item);
                }
                if (itemsmsg.length <= 0) {
                    pl.tell("§c物品上架失败：背包为空");
                    return shopItemsManagement(pl);
                }
                return itemUpload(pl, itemsmsg, items);
            default:
                itemManagement(pl, guids[arg - 1]);
        }
    });
}
function shopHistroy(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("历史记录");
    let content = "";
    for (const historyData of db.get(pl.xuid).history.reverse()) {
        if (content) content += "\n\n";
        content += `购买时间：${historyData.time}\n卖家：${data.xuid2name(
            historyData.buyer
        )}\n物品：${historyData.item.name}§r\n数量：${
            historyData.count
        }\n单价：${historyData.item.price}${eco.name}\nNBT：${
            historyData.item.snbt
        }`;
    }
    fm.setContent(content);
    pl.sendForm(fm, shopManagement);
}
function itemBuy(pl, owner, item) {
    const fm = mc.newCustomForm();
    fm.setTitle("购买确认");
    fm.addLabel(`名称：${item.name}`);
    fm.addLabel(`NBT：${item.snbt}`);
    fm.addLabel(`价格：${item.price}${eco.name}/个`);
    const count = Number(NBT.parseSNBT(item.snbt).getTag("Count"));
    if (count > 1) fm.addInput("数量", "正整形");
    else fm.addLabel("将购买1个");
    const itemNBT = NBT.parseSNBT(item.snbt);
    const tag = itemNBT.getTag("tag");
    const ench = tag ? tag.getData("ench") : undefined;
    if (ench) {
        let msg = "附魔：";
        for (const e of ench.toArray()) {
            msg += `\n${
                [
                    "保护",
                    "火焰保护",
                    "摔落保护",
                    "爆炸保护",
                    "弹射物保护",
                    "荆棘",
                    "水下呼吸",
                    "深海探索者",
                    "水下速掘",
                    "锋利",
                    "亡灵杀手",
                    "节肢杀手",
                    "击退",
                    "火焰附加",
                    "抢夺",
                    "效率",
                    "精准采集",
                    "耐久",
                    "时运",
                    "力量",
                    "冲击",
                    "火矢",
                    "无限",
                    "海之眷顾",
                    "饵钓",
                    "冰霜行者",
                    "经验修补",
                    "绑定诅咒",
                    "消失诅咒",
                    "穿刺",
                    "激流",
                    "忠诚",
                    "引雷",
                    "多重射击",
                    "穿透",
                    "快速装填",
                    "灵魂疾行",
                    "迅捷潜行",
                ][e.id]
            } ${e.lvl}`;
        }
        fm.addLabel(msg);
    }
    if (/potion/.test(itemNBT.getData("Name")))
        fm.addLabel(
            `效果：${
                [
                    "无",
                    "平凡",
                    "延长平凡",
                    "浑浊",
                    "粗制",
                    "夜视",
                    "延长夜视",
                    "隐身",
                    "延长隐身",
                    "跳跃",
                    "延长跳跃",
                    "加强跳跃",
                    "抗火",
                    "延长抗火",
                    "迅捷",
                    "延长迅捷",
                    "加强迅捷",
                    "迟缓",
                    "延长迟缓",
                    "水肺",
                    "延长水肺",
                    "治疗",
                    "加强治疗",
                    "伤害",
                    "加强伤害",
                    "剧毒",
                    "延长剧毒",
                    "加强剧毒",
                    "再生",
                    "延长再生",
                    "加强再生",
                    "力量",
                    "延长力量",
                    "加强力量",
                    "虚弱",
                    "延长虚弱",
                    "衰变",
                    "神龟",
                    "延长神龟",
                    "加强神龟",
                    "缓降",
                    "延长缓降",
                    "加强迟缓",
                ][itemNBT.getTag("Damage")]
            }`
        );
    pl.sendForm(fm, (pl, args) => {
        if (!args) return itemList(pl, owner);
        const shop = db.get(owner);
        const num = args[3] ?? 1;
        if (isNaN(num))
            return pl.tell(
                `§c${item.name}§r*${num}购买失败：数量输入错误（非数字）`
            );
        if (num <= 0)
            return pl.tell(
                `§c${item.name}§r*${num}购买失败：数量输入错误（非正数）`
            );
        if (!shop.items[item.guid])
            return pl.tell(`§c${item.name}§r*${num}购买失败：已被买走`);
        const itemNBT = NBT.parseSNBT(shop.items[item.guid].snbt);
        const count = Number(itemNBT.getTag("Count"));
        if (count < num)
            return pl.tell(`§c${item.name}§r*${num}购买失败：数量过多`);
        const cost = Math.round(num * shop.items[item.guid].price);
        if (cost > eco.get(pl))
            return pl.tell(`§c${item.name}§r*${num}购买失败：余额不足`);
        const newItem = mc.newItem(itemNBT);
        const history = {
            time: system.getTimeStr(),
            buyer: pl.xuid,
            serviceCharge: serviceCharge,
            item: shop.items[item.guid],
            count: num,
        };
        if (count == num) delete shop.items[item.guid];
        else
            shop.items[item.guid].snbt = itemNBT
                .setByte("Count", count - num)
                .toSNBT();
        eco.reduce(pl, cost);
        pl.giveItem(newItem, Number(num));
        const ownerpl = mc.getPlayer(owner);
        if (ownerpl) {
            const get = Math.round(cost * (1 - serviceCharge));
            eco.add(ownerpl, get);
            shop.history.push(history);
            ownerpl.tell(
                `${pl.realName}于${history.time}购买了${history.item.name}§r*${num}（您获得了${get}${eco.name}）`
            );
        } else shop.pending.push(history);
        db.set(shop.owner, shop);
        pl.tell(
            `${history.item.name}§r*${num}购买成功（花费${cost}${eco.name}）`
        );
    });
}
function itemUpload(pl, itemsmsg, items) {
    const fm = mc.newCustomForm();
    fm.setTitle("上架物品");
    fm.addDropdown("物品", itemsmsg);
    fm.addInput("物品名称", "字符串（可空）");
    fm.addInput("物品单价", "正实型");
    fm.addSlider("上架数量", 1, 64);
    pl.sendForm(fm, (pl, args) => {
        if (!args) return shopItemsManagement(pl);
        if (isNaN(args[2])) {
            pl.tell(
                `§c物品${args[1]}§r*${args[3]}上架失败：价格输入错误（非数字）`
            );
            return shopItemsManagement(pl);
        }
        if (args[2] <= 0) {
            pl.tell(
                `§c物品${args[1]}§r*${args[3]}上架失败：价格输入错误（非正数）`
            );
            return shopItemsManagement(pl);
        }
        const item = items[args[0]];
        if (item.count < args[3]) {
            pl.tell(`§c物品${args[1]}§r*${args[3]}上架失败：数量不足`);
            return shopItemsManagement(pl);
        }
        const shop = db.get(pl.xuid);
        const itemNBT = item.getNbt();
        const guid = system.randomGuid();
        shop.items[guid] = {
            name: args[1] || item.name,
            guid: guid,
            price: args[2],
            snbt: itemNBT.setByte("Count", Number(args[3])).toSNBT(),
        };
        db.set(pl.xuid, shop);
        if (item.count == args[3]) item.setNull();
        else
            item.setNbt(itemNBT.setByte("Count", Number(item.count - args[3])));
        pl.refreshItems();
        pl.tell(`物品${args[1]}§r*${args[3]}上架成功`);
        shopItemsManagement(pl);
    });
}
function itemManagement(pl, guid) {
    const fm = mc.newCustomForm();
    const item = db.get(pl.xuid).items[guid];
    if (!item) {
        pl.tell("§c物品修改失败：已被买走");
        return shopItemsManagement(pl);
    }
    fm.setTitle("编辑物品");
    fm.addInput("名称", "字符串（可空）", item.name);
    fm.addInput("价格", "正实型（可空）", item.price);
    const count = Number(NBT.parseSNBT(item.snbt).getTag("Count"));
    fm.addSlider("数量", 0, count, 1, count);
    pl.sendForm(fm, (pl, args) => {
        if (!args) return shopItemsManagement(pl);
        const item = db.get(pl.xuid).items[guid];
        if (!item) {
            pl.tell(`§c物品${args[0]}§r*${args[2]}修改失败：已被买走`);
            return shopItemsManagement(pl);
        }
        if (isNaN(args[1] ?? item.price)) {
            pl.tell(
                `§c物品${args[0]}§r*${args[2]}修改失败：价格输入错误（非数字）`
            );
            return shopItemsManagement(pl);
        }
        if ((args[1] ?? item.price) <= 0) {
            pl.tell(
                `§c物品${args[0]}§r*${args[2]}修改失败：价格输入错误（非正数）`
            );
            return shopItemsManagement(pl);
        }
        const shop = db.get(pl.xuid);
        const itemNBT = NBT.parseSNBT(shop.items[item.guid].snbt);
        const count = Number(itemNBT.getTag("Count"));
        if (count < args[2]) {
            pl.tell(`§c物品${args[0]}§r*${args[2]}修改失败：下架过多`);
            return shopItemsManagement(pl);
        }
        shop.items[item.guid].name = args[0] || item.name;
        shop.items[item.guid].price = args[1] ?? item.price;
        const wbd = args[2] <= 0;
        if (args[2] != count) {
            const it = mc.newItem(itemNBT);
            if (wbd) delete shop.items[item.guid];
            else
                shop.items[item.guid].snbt = itemNBT
                    .setByte("Count", args[2])
                    .toSNBT();
            pl.giveItem(it, count - args[2]);
        }
        db.set(pl.xuid, shop);
        pl.tell(
            wbd
                ? `物品${args[0]}§r下架成功`
                : `物品${args[0]}§r*${args[2]}修改成功`
        );
        shopItemsManagement(pl);
    });
}
