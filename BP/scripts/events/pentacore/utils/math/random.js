import { Direction } from "./math";
import { Offset } from "./offset";

export {
    Random
}

class Random {
    /** @param {Number} a @param {Number} b @returns {Number} */
    static int(a, b) {
        let min = Math.min(a, b)
        let max = Math.max(a, b)
        return Math.floor(Math.random() * (max - min + 1)) + min  
    }

    /** @param {Number} a @param {Number} b @returns {Number} */
    static float(a, b) {
        let min = Math.min(a, b);
        let max = Math.max(a, b);
        return this.int(min*10**17, max*10**17)/10**17
    }

    /** @returns {1 | -1} */
    static sign() {
        return Math.random() > 0.5 ? -1 : 1;
    }

    /** @param {Number} chance @returns {Boolean} */
    static chance(chance) {
        return chance > this.float(0, 100)
    }

    /** @param {Number[]} range @returns {Number} */
    static range(range, float = false) {
        return float ? this.float(range[0], range[1]) : this.int(range[0], range[1]);
    }

    /** @param {import("@minecraft/server").Vector3 | Number} radius @param {import("@minecraft/server").Vector3} offset @returns {import("@minecraft/server").Vector3} */
    static location(radius, offset = {}) {
        if (typeof radius == 'number') radius = {
            x: radius,
            z: radius,
            y: radius
        }
        return {
            x: this.float(-radius.x, radius.x) + (offset.x || 0),
            y: this.float(-radius.y, radius.y) + (offset.y || 0),
            z: this.float(-radius.z, radius.z) + (offset.z || 0)
        }
    }

    /** @param {import("@minecraft/server").Vector3} axisModifiers */
    static direction(axisModifiers = {}) {
        return new Direction(Offset.none[0], this.location({ x: axisModifiers.x ?? 1, y: axisModifiers.y ?? 1, z: axisModifiers.z ?? 1 }))
    }

    /** @param {{ x?: ([Number, Number] | Number), y?: ([Number, Number] | Number), z?: ([Number, Number] | Number) }} axisModifiers @param {[Number, Number] | Number} distance */
    static vector(axisModifiers = {}, distance = 1) {
        distance = Array.isArray(distance) ? this.float(distance[0], distance[1]) : distance;
        const ranges = {
            x: Array.isArray(axisModifiers.x) ? axisModifiers.x : [-(axisModifiers.x ?? 1), (axisModifiers.x ?? 1)],
            y: Array.isArray(axisModifiers.y) ? axisModifiers.y : [-(axisModifiers.y ?? 1), (axisModifiers.y ?? 1)],
            z: Array.isArray(axisModifiers.z) ? axisModifiers.z : [-(axisModifiers.z ?? 1), (axisModifiers.z ?? 1)]
        };

        const vector = {
            x: this.float(ranges.x[0], ranges.x[1]),
            y: this.float(ranges.y[0], ranges.y[1]),
            z: this.float(ranges.z[0], ranges.z[1])
        };
        const multiplier = distance * Math.sqrt(vector.x*vector.x, + vector.y*vector.y + vector.z*vector.z);

        return {
            x: vector.x * multiplier,
            y: vector.y * multiplier,
            z: vector.z * multiplier
        };
    }

    /**
     * @template T
     * @param {T[]} array 
     * @returns {T}
     */
    static element(array) {
        return array[this.int(0, array.length-1)];
    }
    
    /** @template T @param {[T, Number][]} array @returns {T} */
    static elementW(array) {
        let sum = 0;
        array = array.map(data => {
            sum += data[1];
            return {
                element: data[0],
                range: [sum - data[1], sum]
            }
        })

        const value = this.float(0, sum);
        if (value >= sum) return array[array.length - 1]?.element;
        return array.find((data) => data.range[0] <= value && data.range[1] > value)?.element
    }

    /** @template T @param {T[]} array @returns {T[]} */
    static select(array, amount = 1, allowRepetition = false) {
        if (allowRepetition) return Array.from({ length: amount }, (() => array[this.int(0, array.length-1)]));
        else {
            const unusedIndexes = Array.from(array.keys());
            return Array.from({ length: Math.min(array.length, amount) }, () => {
                const index = this.int(0, unusedIndexes.length-1);

                const elementIndex = unusedIndexes[index];
                unusedIndexes[index] = unusedIndexes[unusedIndexes.length-1];
                unusedIndexes.length -= 1;

                return array[elementIndex];
            });
        }
    }
}