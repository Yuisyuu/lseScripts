"use strict";
// !!DEBUG MODE!!
const DEBUG_MODE = true;
// !!DEBUG MODE!!

ll.registerPlugin("Bazaar", "集市", [2, 0, 0]);

const config = new JsonConfigFile("plugins/Bazaar/config.json");
const command = config.init("command", "bazaar");
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
        default:
            throw "配置项异常！";
    }
})();
const serviceCharge = config.init("serviceCharge", 0.02);
config.close();
const db = DEBUG_MODE
    ? JSON.parse(File.readFrom("plugins/Bazaar/data.json") ?? "{}")
    : new KVDatabase("plugins/Bazaar/data");
if (DEBUG_MODE) {
    Object.prototype.get = function (key) {
        return this[key];
    };
    Object.prototype.set = function (key, value) {
        this[key] = value;
        File.writeTo("plugins/Bazaar/data.json", JSON.stringify(this));
    };
}
const ench = [
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
];
const eff = [
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
];
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand(command, "打开集市。", PermType.Any);
    cmd.overload();
    cmd.setCallback((_cmd, ori, out, _res) => {
        if (ori.player) return main(ori.player);
        return out.error("commands.generic.noTargetMatch");
    });
    cmd.setup();
});
mc.listen("onJoin", (pl) => {
    const sellers = db.get("sellers") ?? {};
    if (!(pl.xuid in sellers)) {
        sellers[pl.xuid] = {
            items: [],
            offers: [],
            unprocessedTransactions: [],
        };
        db.set("sellers", sellers);
        return;
    }
    for (const unprocessedTransaction of sellers[pl.xuid]
        .unprocessedTransactions) {
        // TODO 未处理的交易
    }
    db.set("sellers", sellers);
});
function main(pl) {
    const sellers = db.get("sellers") ?? {};
    const items = db.get("items") ?? {};
    const itemsCount = Object.keys(items).length;
    const offers = db.get("offers") ?? {};
    const offersCount = Object.keys(offers).length;
    const fm = mc.newSimpleForm();
    fm.setTitle("集市");
    fm.addButton(
        `出售${
            itemsCount > 0
                ? `\n${
                      sellers[pl.xuid].items.length > 0
                          ? `${sellers[pl.xuid].items.length}/`
                          : ""
                  }${itemsCount}`
                : ""
        }`
    );
    fm.addButton(
        `回收${
            offersCount > 0
                ? `\n${
                      sellers[pl.xuid].offers.length > 0
                          ? `${sellers[pl.xuid].offers.length}/`
                          : ""
                  }${offersCount}`
                : ""
        }`
    );
    pl.sendForm(fm, (pl, arg) => {
        switch (arg) {
            case 0:
                return browseItems(pl);
            case 1:
                return browseOffers(pl);
        }
    });
}
function browseItems(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("出售集市");
    fm.addButton("管理物品");
    const items = db.get("items") ?? {};
    for (const item of Object.values(items)) {
        if (item.seller == pl.xuid) continue;
        const itemNBT = NBT.parseSNBT(item.snbt);
        fm.addButton(
            `${itemNBT.getTag("Name")}*${item.count}\n${item.price}${
                eco.name
            }/个 ${data.xuid2name(item.seller)}`
        );
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) return main(pl);
        switch (arg) {
            case 0:
                return itemsManagement(pl);
            default:
                return itemBuy(pl, Object.keys(items)[arg - 1]);
        }
    });
}
function browseOffers(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("回收集市");
    fm.addButton("管理报价");
    const offers = db.get("offers") ?? {};
    for (const offer of Object.values(offers)) {
        if (offer.seller == pl.xuid) continue;
        fm.addButton(
            `${offer.type}（${offer.data}）*${offer.count}\n${offer.price}${
                eco.name
            }/个 ${data.xuid2name(offer.seller)}`
        );
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) return main(pl);
        switch (arg) {
            case 0:
                return offersManagement(pl);
            default:
                return offerProcess(pl, Object.keys(offers)[arg - 1]);
        }
    });
}
function itemsManagement(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("物品管理");
    fm.addButton("上架物品");
    const sellers = db.get("sellers") ?? {};
    const items = db.get("items") ?? {};
    for (const guid of sellers[pl.xuid].items) {
        const itemNBT = NBT.parseSNBT(items[guid].snbt);
        fm.addButton(
            `${itemNBT.getTag("Name")}*${items[guid].count}\n${
                items[guid].price
            }${eco.name}/个`
        );
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) return browseItems(pl);
        switch (arg) {
            case 0:
                return itemUpload(pl);
            default:
                return itemEdit(pl, sellers[pl.xuid].items[arg - 1]);
        }
    });
}
function offersManagement(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("报价管理");
    fm.addButton("创建报价");
    const sellers = db.get("sellers") ?? {};
    const offers = db.get("offers") ?? {};
    for (const guid of sellers[pl.xuid].offers)
        fm.addButton(
            `${offers[guid].type}*${offers[guid].count}\n${offers[guid].price}${eco.name}/个`
        );
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) return browseOffers(pl);
        switch (arg) {
            case 0:
                return offerCreate(pl);
            default:
                return offerEdit(pl, sellers[pl.xuid].offers[arg - 1]);
        }
    });
}
function itemBuy(pl, guid) {
    const items = db.get("items") ?? {};
    if (!(guid in items)) {
        pl.sendToast("集市", "§c物品购买失败：已下线");
        return browseItems(pl);
    }
    let canBuyMax = Math.round(eco.get(pl) / items[guid].price);
    if (canBuyMax <= 0) {
        pl.sendToast("集市", "§c物品购买失败：余额不足");
        return browseItems(pl);
    }
    if (items[guid].count < canBuyMax) {
        canBuyMax = items[guid].count;
    }
    const fm = mc.newCustomForm();
    fm.setTitle("购买物品");
    const itemNBT = NBT.parseSNBT(items[guid].snbt);
    fm.addLabel(`类型：${itemNBT.getTag("Name")}`);
    fm.addLabel(`单价：${items[guid].price}`);
    fm.addLabel(`NBT：${items[guid].snbt}`);
    const canBuyMin = 1 / items[guid].price;
    if (canBuyMin < canBuyMax)
        fm.addSlider("数量", Math.round(canBuyMin), Math.round(canBuyMax));
    else fm.addLabel(`将购买${canBuyMax}个`);
    const tag = itemNBT.getTag("tag");
    const enchData = tag ? tag.getData("ench") : undefined;
    if (enchData) {
        let msg = "附魔：";
        for (const e of enchData.toArray()) {
            msg += `\n${ench[e.id]} ${e.lvl}`;
        }
        fm.addLabel(msg);
    }
    if (/potion/.test(itemNBT.getData("Name")))
        fm.addLabel(`效果：${eff[itemNBT.getTag("Damage")]}`);
    pl.sendForm(fm, (pl, args) => {
        if (!args) return browseItems(pl);
        const nowItems = db.get("items") ?? {};
        if (!(guid in nowItems)) {
            pl.sendToast("集市", "§c物品购买失败：已下线");
            return browseItems(pl);
        }
        const num = args[3] ?? canBuyMax;
        if (nowItems[guid].count < num) {
            pl.sendToast("集市", "§c物品购买失败：库存不足");
            return browseItems(pl);
        }
        const cost = Math.round(num * nowItems[guid].price);
        if (eco.get(pl) < cost) {
            pl.sendToast("集市", "§c物品购买失败：余额不足");
            return browseItems(pl);
        }
        const seller = nowItems[guid].seller;
        const sellers = db.get("sellers") ?? {};
        if (nowItems[guid].count <= num) {
            delete nowItems[guid];
            sellers[seller].items.splice(
                sellers[seller].items.indexOf(guid),
                1
            );
        } else nowItems[guid].count -= num;
        eco.reduce(pl, cost);
        const newItem = mc.newItem(itemNBT);
        pl.giveItem(newItem, num);
        const sellerObj = mc.getPlayer(seller);
        if (sellerObj) {
            const get = Math.round(cost * (1 - serviceCharge));
            eco.add(sellerObj, get);
            sellerObj.tell(`物品被购买（您获得了${get}${eco.name}）`);
        } else
            sellers[seller].unprocessedTransactions.push({
                price: nowItems[guid].price,
                count: num,
                serviceCharge: serviceCharge,
            });
        db.set("sellers", sellers);
        db.set("items", nowItems);
        pl.sendToast("集市", "物品购买成功");
        return browseItems(pl);
    });
}
function offerProcess(pl, guid) {
    const offers = db.get("offers") ?? {};
    if (!(guid in offers)) {
        pl.sendToast("集市", "§c报价处理失败：已下线");
        return browseOffers(pl);
    }
    const invItems = pl.getInventory().getAllItems();
    // TODO 物品类型确认
    const item = mc.newItem(
        NBT.parseSNBT(
            `{"Name":"${offers[guid].type}","Damage":${offers[guid].data}s,"Count":1b}`
        )
    );
    let itemCount = 0;
    for (const invItem of invItems) {
        if (invItem.isNull()) continue;
        if (invItem.match(item)) itemCount += invItem.count;
    }
    if (itemCount <= 0) {
        pl.sendToast("集市", "§c报价处理失败：物品不足");
        return browseOffers(pl);
    }
    if (itemCount > offers[guid].count) {
        itemCount = offers[guid].count;
    }
    const fm = mc.newCustomForm();
    fm.setTitle("报价处理");
    fm.addLabel(`类型：${offers[guid].type}`);
    fm.addLabel(`单价：${offers[guid].price}/个`);
    fm.addLabel(`税率：${serviceCharge * 100}％`);
    if (itemCount > 1) fm.addSlider("数量", 1, itemCount);
    else fm.addLabel("数量：1");
    pl.sendForm(fm, (pl, args) => {
        if (!args) return browseOffers(pl);
        // TODO 报价处理
    });
}
function itemUpload(pl, args = [0, "", 1]) {
    const invItems = pl.getInventory().getAllItems();
    const itemData = [];
    invItems.forEach((invItem) => {
        if (invItem.isNull()) return;
        for (const item of itemData)
            if (item.item.match(invItem)) {
                item.count += invItem.count;
                return;
            }
        itemData.push({
            count: invItem.count,
            item: invItem.clone(),
        });
    });
    if (itemData.length <= 0) {
        pl.sendToast("集市", "§c物品上架失败：物品不足");
        return itemsManagement(pl);
    }
    const namesOfItem = [];
    let max = 0;
    for (const item of itemData) {
        const itemNBT = item.item.getNbt();
        const tag = itemNBT.getTag("tag");
        const enchData = tag ? tag.getData("ench") : undefined;
        let msg = "";
        if (enchData) {
            for (const e of enchData.toArray()) {
                msg += ` ${ench[e.id]} ${e.lvl}`;
            }
        }
        if (/potion/.test(itemNBT.getData("Name")))
            msg += ` ${eff[itemNBT.getTag("Damage")]}`;
        namesOfItem.push(
            `${item.item.name}（${item.item.type} ${item.item.aux}${msg}）*${item.count}`
        );
        if (max < item.count) max = item.count;
    }
    const fm = mc.newCustomForm();
    fm.setTitle("上架物品");
    fm.addDropdown("物品", namesOfItem, args[0]);
    fm.addInput("价格", "正实型", args[1]);
    if (max < 2) fm.addLabel("数量：1");
    else fm.addSlider("数量", 1, max, 1, args[2]);
    pl.sendForm(fm, (pl, args) => {
        if (!args) return itemsManagement(pl);
        if (isNaN(args[1]) || args[1] < 0) {
            pl.sendToast("集市", "§c物品上架失败：无效价格");
            return itemUpload(pl, args);
        }
        let num = args[2] ?? 1;
        const invItems = pl.getInventory().getAllItems();
        let itemCount = 0;
        for (const invItem of invItems) {
            if (invItem.isNull()) continue;
            if (invItem.match(itemData[args[0]].item))
                itemCount += invItem.count;
        }
        if (itemCount < num) {
            pl.sendToast("集市", "§c物品上架失败：物品不足");
            return itemUpload(pl, args);
        }
        const items = db.get("items") ?? {};
        const guid = system.randomGuid();
        items[guid] = {
            snbt: itemData[args[0]].item.getNbt().toSNBT(),
            count: num,
            price: args[1],
            seller: pl.xuid,
        };
        for (const invItem of invItems) {
            if (num <= 0) break;
            if (invItem.isNull()) continue;
            if (invItem.match(itemData[args[0]].item)) {
                if (invItem.count <= num) {
                    num -= invItem.count;
                    invItem.setNull();
                    continue;
                }
                invItem.setNbt(
                    invItem
                        .getNbt()
                        .setByte("Count", Number(invItem.count - num))
                );
            }
        }
        pl.refreshItems();
        const sellers = db.get("sellers") ?? {};
        sellers[pl.xuid].items.push(guid);
        db.set("items", items);
        db.set("sellers", sellers);
        pl.sendToast("集市", "物品上架成功");
        return itemUpload(pl);
    });
}
function offerCreate(pl, args = ["", "0", "", "", "", 0]) {
    if (eco.get(pl) <= 0) {
        pl.sendToast("集市", "§c报价创建失败：余额不足");
        return offersManagement(pl);
    }
    const fm = mc.newCustomForm();
    fm.setTitle("创建报价");
    fm.addInput("标准类型名", "命名空间:物品名", args[0]);
    fm.addInput("数据值", "整型", args[1]);
    fm.addInput("数量", "正整型", args[2]);
    fm.addInput("价格", "正实型", args[3]);
    fm.addInput("附魔", "数组（整形，逗号分隔，可空）", args[4]);
    fm.addDropdown("效果（类型为药水时有效）", eff, args[5]);
    pl.sendForm(fm, (pl, args) => {
        if (!args) return offersManagement(pl);
        if (!args[0] || mc.newItem(args[0], 1).isNull()) {
            pl.sendToast("集市", "§c报价创建失败：无效类型名");
            return offerCreate(pl, args);
        }
        if (isNaN(args[1])) {
            pl.sendToast("集市", "§c报价创建失败：无效数据值");
            return offerCreate(pl, args);
        }
        if (args[2] <= 0) {
            pl.sendToast("集市", "§c报价创建失败：无效数量");
            return offerCreate(pl, args);
        }
        if (args[3] <= 0) {
            pl.sendToast("集市", "§c报价创建失败：无效价格");
            return offerCreate(pl, args);
        }
        const cost = Math.round(args[2] * args[3]);
        if (eco.get(pl) < cost) {
            pl.sendToast("集市", "§c报价创建失败：余额不足");
            return offerCreate(pl, args);
        }
        const offers = db.get("offers") ?? {};
        const guid = system.randomGuid();
        offers[guid] = {
            type: args[0],
            data: args[1],
            count: args[2],
            price: args[3],
            seller: pl.xuid,
        };
        if (args[4]) offers[guid].ench = args[4].split(/,[\s]?/);
        if (args[5] && args[0].match("potion")) offers[guid].exData = args[5];
        db.set("offers", offers);
        const sellers = db.get("sellers") ?? {};
        sellers[pl.xuid].offers.push(guid);
        db.set("sellers", sellers);
        eco.reduce(pl, args[2] * args[3]);
        pl.sendToast("集市", "报价创建成功");
        return offerCreate(pl);
    });
}
function itemEdit(pl, guid) {
    const items = db.get("items") ?? {};
    if (!(guid in items)) {
        pl.sendToast("集市", "§c物品编辑失败：已下线");
        return itemsManagement(pl);
    }
    const fm = mc.newCustomForm();
    // TODO
    fm.addLabel("未完成，尽请期待！");
    pl.sendForm(fm, (pl, args) => {
        return itemsManagement(pl);
    });
}
function offerEdit(pl, guid) {
    const offers = db.get("offers") ?? {};
    if (!(guid in offers)) {
        pl.sendToast("集市", "§c报价编辑失败：已下线");
        return offersManagement(pl);
    }
    const fm = mc.newCustomForm();
    // TODO
    fm.addLabel("未完成，尽请期待！");
    pl.sendForm(fm, (pl, args) => {
        return offersManagement(pl);
    });
}