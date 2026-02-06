import { system, EnchantmentType, EnchantmentTypes } from "@minecraft/server";
import { Random } from "./math/random.js";

/**
 * @template T
 * @param {Iterable<T>} array 
 * @param {(value: T, index: Number)} callback
 * @returns {Promise<Void>} 
 */
export function runJob(array, callback) {
	return new Promise(resolve => {
		system.runJob((function* gen() {
			let index = 0;
			for (const value of array) {
				callback(value, index)
				
				index++
				yield;
			}

			resolve();
		})())
	})
}

/** @param {import('@minecraft/server').ItemStack} item */
export function decrementItem(item, count = 1) {
	item = item.clone();
	if (item.amount - count <= 0) return undefined;
	item.amount -= count;
	return item;
}

/** @param {import('@minecraft/server').Entity} entity */
export function getSelected(entity) {
	return entity.getComponent('equippable')?.getEquipment('Mainhand');
}

/** @param {import('@minecraft/server').Entity} entity @param {import('@minecraft/server').ItemStack} item */
export function setSelected(entity, item = undefined) {
	return entity.getComponent('equippable')?.setEquipment('Mainhand', item);
}

/**
 * @param {ItemStack} item
 * @param {Object} options
 * @param {Number} options.chance [0.0, 1.0]
 * @param {Number} options.maxAmount
 * @param {(import("@minecraft/server").EnchantmentType | String)[]} options.types
 * @param {String[]} options.excludeTypes
 * @returns {import("@minecraft/server").Enchantment[]} added enchantments 
 */
export function addRandomEnchantments(item, options = {}) {
    const enchantable = item.getComponent('enchantable');
    if (enchantable == undefined) return [];

    const added = [];
    for (let type of (options.types || EnchantmentTypes.getAll()).toSorted(() => Math.random() - Math.random())) {
        if (!(type instanceof EnchantmentType)) type = new EnchantmentType(type);

        if (options.excludeTypes?.includes(type.id)) continue;
        if (options.chance != undefined && !Random.chance(options.chance * 100)) continue;

        const enchantment = {
            level: Random.int(1, type.maxLevel),
            type: type
        }

        try {
            enchantable.addEnchantment(enchantment);
            added.push(enchantment);
        } catch {};

        if (added.length >= (options.maxAmount || Infinity)) return added;
    }

    return added;
}