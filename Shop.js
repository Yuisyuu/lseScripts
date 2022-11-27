/*
English:
    Shop
    Copyright (C) 2022  StarsDream00 starsdream00@icloud.com

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
    商店
    版权所有 © 2022  星梦喵吖 starsdream00@icloud.com
    本程序是自由软件：你可以根据自由软件基金会发布的GNU Affero通用公共许可证的条款，即许可证的第3版，
    或（您选择的）任何后来的版本重新发布和/或修改它。

    本程序的分发是希望它能发挥价值，但没有做任何保证；甚至没有隐含的适销对路或适合某一特定目的的保证。
    更多细节请参见GNU Affero通用公共许可证。

    您应该已经收到了一份GNU Affero通用公共许可证的副本。如果没有，
    请参阅<https://www.gnu.org/licenses/>（<https://www.gnu.org/licenses/agpl-3.0.html>）
    及其非官方中文翻译<https://www.chinasona.org/gnu/agpl-3.0-cn.html>。
*/

"use strict";
ll.registerPlugin("Shop", "商店", [1, 1, 9]);

const config = new JsonConfigFile("plugins\\Shop\\config.json");
const command = config.init("command", "shop");
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
        default:
            throw "配置项异常！";
    }
})();
config.close();
const db = new JsonConfigFile("plugins\\Shop\\data.json");
const sell = db.init("sell", []);
const recycle = db.init("recycle", []);
db.close();
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand(command, "打开商店菜单。", PermType.Any);
    cmd.overload();
    cmd.setCallback((_cmd, ori, out, _res) => {
        if (ori.player) return main(ori.player);
        return out.error("commands.generic.noTargetMatch");
    });
    cmd.setup();
});
function main(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("商店菜单");
    fm.addButton("购买");
    fm.addButton("回收");
    pl.sendForm(fm, (pl, e) => {
        switch (e) {
            case 0:
                return sellShop(pl, sell, []);
            case 1:
                return recycleShop(pl, recycle, []);
        }
    });
}
function sellShop(pl, shop, shopLink) {
    const fm = mc.newSimpleForm();
    fm.setTitle(`购买商店 - ${shopLink.length <= 0 ? "主商店" : shop.name}`);
    const items = shopLink.length <= 0 ? shop : shop.items;
    for (const item of items) {
        if (item.items) {
            if (item.icon) {
                fm.addButton(item.name, item.icon);
                continue;
            }
            fm.addButton(item.name);
            continue;
        }
        if (item.icon) {
            fm.addButton(
                `${item.name}\n${item.price}${eco.name}/个`,
                item.icon
            );
            continue;
        }
        fm.addButton(`${item.name}\n${item.price}${eco.name}/个`);
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) {
            if (shopLink.length > 0) {
                return sellShop(pl, shopLink.pop(), shopLink);
            }
            return main(pl);
        }
        const item = items[arg];
        if (item.items) {
            shopLink.push(shop);
            return sellShop(pl, item, shopLink);
        }
        const maxNum = eco.get(pl) / item.price;
        if (maxNum <= 0) {
            pl.tell(`§c物品${item.name}购买失败：余额不足`);
            return sellShop(pl, shop, shopLink);
        }
        shopLink.push(shop);
        return sellConfirm(pl, item, maxNum, shopLink);
    });
}
function sellConfirm(pl, itemData, maxNum, shopLink) {
    const fm = mc.newCustomForm();
    fm.setTitle("购买物品");
    fm.addLabel(`名称：${itemData.name}`);
    fm.addLabel(`单价：${itemData.price}`);
    if (maxNum > 1)
        fm.addSlider(
            "数量",
            Math.round(1 / itemData.price),
            Math.round(maxNum)
        );
    else fm.addLabel("数量：1");
    pl.sendForm(fm, (pl, args) => {
        if (!args) return sellShop(pl, shopLink.pop(), shopLink);
        const num = args[2] ?? 1;
        const cost = itemData.price * num;
        if (eco.get(pl) < cost) {
            pl.tell(`§c物品${itemData.name}*${num}购买失败：余额不足`);
            return sellShop(pl, shopLink.pop(), shopLink);
        }
        const item = mc.newItem(itemData.id, Number(num));
        if (itemData.dataValues) item.setAux(itemData.dataValues);
        if (itemData.enchantments) {
            const ench = new NbtList();
            for (const enchantment in itemData.enchantments) {
                ench.addTag(
                    new NbtCompound({
                        id: new NbtInt(Number(enchantment.id)),
                        lvl: new NbtInt(Number(enchantment.lvl)),
                    })
                );
            }
            const nbt = item.getNbt();
            const tag = nbt.getTag("tag");
            item.setNbt(
                nbt.setTag(
                    "tag",
                    tag
                        ? tag.setTag("ench", ench)
                        : new NbtCompound({
                              ench: ench,
                          })
                )
            );
        }
        if (!pl.getInventory().hasRoomFor(item)) {
            pl.tell(`§c物品${itemData.name}*${num}购买失败：空间不足`);
            return sellShop(pl, shopLink.pop(), shopLink);
        }
        eco.reduce(pl, Math.round(cost));
        pl.giveItem(item, Number(num));
        pl.tell(
            `物品${itemData.name}*${num}购买成功（花费${cost}${eco.name}）`
        );
        return sellShop(pl, shopLink.pop(), shopLink);
    });
}
function recycleShop(pl, shop, shopLink) {
    const fm = mc.newSimpleForm();
    fm.setTitle(`回收商店 - ${shopLink.length <= 0 ? "主商店" : shop.name}`);
    const items = shopLink.length <= 0 ? shop : shop.items;
    for (const item of items) {
        if (item.items) {
            if (item.icon) {
                fm.addButton(item.name, item.icon);
                continue;
            }
            fm.addButton(item.name);
            continue;
        }
        if (item.icon) {
            fm.addButton(
                `${item.name}\n${item.price}${eco.name}/个`,
                item.icon
            );
            continue;
        }
        fm.addButton(`${item.name}\n${item.price}${eco.name}/个`);
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) {
            if (shopLink.length > 0) {
                return recycleShop(pl, shopLink.pop(), shopLink);
            }
            return main(pl);
        }
        const item = items[arg];
        if (item.items) {
            shopLink.push(shop);
            return recycleShop(pl, item, shopLink);
        }
        let count = 0;
        for (const plsItem of pl.getInventory().getAllItems()) {
            if (
                plsItem.type != item.id ||
                (item.dataValues && plsItem.aux != item.dataValues)
            )
                continue;
            count += plsItem.count;
        }
        if (count <= 0) {
            pl.tell(`§c物品${item.name}回收失败：数量不足`);
            return recycleShop(pl, shop, shopLink);
        }
        shopLink.push(shop);
        return recycleConfirm(pl, item, count, shopLink);
    });
}
function recycleConfirm(pl, itemData, count, shopLink) {
    const fm = mc.newCustomForm();
    fm.setTitle("回收物品");
    fm.addLabel(`名称：${itemData.name}`);
    fm.addLabel(`单价：${itemData.price}`);
    fm.addLabel(`当前税率：${serviceCharge * 100}％`);
    if (count > 1) fm.addSlider("数量", 1, count);
    else fm.addLabel("数量：1");
    pl.sendForm(fm, (pl, args) => {
        if (!args) return recycleShop(pl, shopLink.pop(), shopLink);
        const its = pl.getInventory().getAllItems();
        let count = 0;
        for (const item of its) {
            if (
                item.type != itemData.id ||
                (itemData.dataValues && item.aux != itemData.dataValues)
            )
                continue;
            count += item.count;
        }
        const num = args[3] ?? 1;
        if (count < num) {
            pl.tell(
                `§c物品${itemData.name}回收失败：数量不足（只有${count}个）`
            );
            return recycleShop(pl, shopLink.pop(), shopLink);
        }
        let buyCount = num;
        for (const item of its) {
            if (buyCount <= 0) break;
            if (
                item.type != itemData.id ||
                (itemData.dataValues && item.aux != itemData.dataValues)
            )
                continue;
            if ((buyCount -= item.count) < 0)
                item.setNbt(item.getNbt().setByte("Count", Math.abs(buyCount)));
            else item.setNull();
            pl.refreshItems();
        }
        const add = Math.round(num * itemData.price * (1 - serviceCharge));
        eco.add(pl, add);
        pl.tell(`物品${itemData.name}*${num}回收成功（获得${add}${eco.name}）`);
        return recycleShop(pl, shopLink.pop(), shopLink);
    });
}
