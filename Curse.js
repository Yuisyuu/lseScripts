/*
English:
    VanishingCurse
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
    消失诅咒
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
ll.registerPlugin("Curse", "诅咒", [1, 0, 0]);

mc.listen("onPlayerDie", (pl, _src) => {
    process(pl, pl.getInventory());
    process(pl, pl.getArmor());
});

function process(pl, inv) {
    const its = inv.getAllItems();
    for (const it of its) {
        const tag = it.getNbt().getTag("tag");
        if (!tag) continue;
        const enchData = tag.getData("ench");
        if (!enchData) continue;
        let enchs = enchData.toArray();
        if (enchs.includes(28));
        else if (enchs.includes(27))
            NativeFunction.fromSymbol(
                "?drop@Player@@UEAA_NAEBVItemStack@@_N@Z"
            ).call(pl.asPointer(), it.asPointer(), true);
        else continue;
        it.setNull();
        pl.refreshItems();
    }
}
