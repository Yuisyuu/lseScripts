/*
English:
    Title
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
    头衔
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
ll.registerPlugin("Title", "头衔", [1, 0, 0]);

const db = new KVDatabase("plugins/Title/data");
const addCommand = mc.newCommand("addtitle", "添加头衔。");
addCommand.mandatory("player", ParamType.Player);
addCommand.mandatory("title", ParamType.String);
addCommand.overload(["player", "title"]);
addCommand.setCallback((_cmd, _ori, out, res) => {
    for (const pl of res.player) {
        pl.rename(`${res.title}\n${pl.realName}`);
        db.set(pl.xuid, res.title);
    }
    return out.success(`已为${res.player.length}个玩家添加头衔${res.title}`);
});
addCommand.setup();
const removeCommand = mc.newCommand("removetitle", "移除头衔。");
removeCommand.mandatory("player", ParamType.Player);
removeCommand.overload(["player"]);
removeCommand.setCallback((_cmd, _ori, out, res) => {
    for (const pl of res.player) {
        pl.rename(pl.realName);
        db.delete(pl.xuid);
    }
    return out.success(`已为${res.player.length}个玩家移除头衔`);
});
removeCommand.setup();
mc.listen("onChat", (pl, msg) => {
    const title = db.get(pl.xuid);
    if (!title) return;
    mc.broadcast(`${title ? `[${title}}]` : ""}<${pl.realName}> ${msg}`);
    return false;
});
mc.listen("onJoin", (pl) => {
    const title = db.get(pl.xuid);
    if (!title) return;
    pl.rename(`${title}\n${pl.realName}`);
});
ll.exports((xuid) => db.get(xuid), "Title", "GetFromXuid");
