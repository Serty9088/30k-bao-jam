import { system } from "@minecraft/server";

/**
 * Detects patterns in a structure and summons an entity at the first occurrence of the pattern
 * @type {StructureDetector}
 * @constructor
 * @param {Object} patternTypes - An object where each key is a character and each value is the corresponding block type
 * @param {Array} basePattern - A 3D array representing the base pattern to detect
 * @param {Function} summonEntity - A function that summons an entity at a given position
 */
class StructureDetector {
    constructor(patternTypes, basePattern, summonEntity) {
        this.patternTypes = patternTypes;
        this.basePattern = basePattern;
        this.triggerBlock = this.patternTypes[Object.keys(this.patternTypes).pop()];
        this.transformedPatterns = this.generateAllTransformations();
        this.summonEntity = summonEntity;
        StructureDetector.instances.push(this);
    }

    static instances = [];

    generateAllTransformations() {
        const transformations = [];
        const seen = new Map(); // Use Map instead of Set with JSON.stringify
        
        const baseTransforms = [
            this.basePattern,
            StructureDetector.flipEntirePattern(this.basePattern),
            StructureDetector.transposeYZ(this.basePattern),
            StructureDetector.transposeXY(this.basePattern)
        ];

        for (let current of baseTransforms) {
            for (let i = 0; i < 4; i++) {
                this.addUniquePattern(transformations, seen, current);
                this.addUniquePattern(transformations, seen, current.map(layer => StructureDetector.flipLayerHorizontal(layer)));
                this.addUniquePattern(transformations, seen, current.map(layer => StructureDetector.flipLayerVertical(layer)));
                current = current.map(layer => StructureDetector.rotateLayer(layer));
            }
        }

        return transformations;
    }

    addUniquePattern(transformations, seen, pattern) {
        const hash = this.hashPattern(pattern);
        if (!seen.has(hash)) {
            seen.set(hash, true);
            transformations.push(pattern);
        }
    }

    hashPattern(pattern) {
        // Faster hashing without JSON.stringify
        return pattern.map(layer => layer.join('|')).join('||');
    }

    detectStructure(dimension, block, rotation, actualLocation) {
        if (block.typeId !== this.triggerBlock) return;
        
        // Run single job instead of multiple concurrent jobs
        system.runJob(this.detectAllPatternsJob(dimension, block, rotation, actualLocation));
    }

    *detectAllPatternsJob(dimension, block, rotation, actualLocation) {
        const state = { isDone: false };
        
        for (const transformed of this.transformedPatterns) {
            if (state.isDone) return; // Early exit if already found
            
            const triggerPositions = this.getTriggerBlockOffsets(transformed);
            
            // Only check positions where trigger block exists in pattern
            for (const offset of triggerPositions) {
                if (state.isDone) return;
                
                const origin = {
                    x: Math.floor(block.location.x - offset.x),
                    y: Math.floor(block.location.y - offset.y),
                    z: Math.floor(block.location.z - offset.z)
                };
                
                yield* this.checkStructureJob(dimension, origin, transformed, state, rotation, actualLocation);
            }
        }
    }

    getTriggerBlockOffsets(pattern) {
        const offsets = [];
        for (let y = 0; y < pattern.length; y++) {
            for (let z = 0; z < pattern[y].length; z++) {
                for (let x = 0; x < pattern[y][z].length; x++) {
                    if (this.patternTypes[pattern[y][z][x]] === this.triggerBlock) {
                        offsets.push({ x, y, z });
                    }
                }
            }
        }
        return offsets;
    }

    getPatternDimensions(pattern) {
        return {
            width: pattern[0][0].length,
            height: pattern.length,
            depth: pattern[0].length
        };
    }

    *checkStructureJob(dimension, origin, pattern, state, rotation, actualLocation) {
        if (state.isDone) return; // Early exit
        
        let count = 0;
        for (let y = 0; y < pattern.length; y++) {
            for (let z = 0; z < pattern[y].length; z++) {
                for (let x = 0; x < pattern[y][z].length; x++) {
                    const expected = this.patternTypes[pattern[y][z][x]];
                    if (!expected) continue;

                    const pos = {
                        x: origin.x + x,
                        y: origin.y + y,
                        z: origin.z + z
                    };

                    const block = dimension.getBlock(pos);
                    if (!block || block.typeId !== expected) return;
                    
                    // Yield more frequently for better performance
                    if (++count % 5 === 0) yield;
                }
            }
        }
        
        if (state.isDone) return;
        state.isDone = true;
        
        yield* this.removeStructureChunkedJob(dimension, origin, pattern);
        this.summonEntity(
            dimension,
            origin,
            rotation ?? { x: 0, y: 0 },
            actualLocation ?? origin
        );
    }

    *removeStructureChunkedJob(dimension, origin, pattern) {
        let count = 0;
        for (let y = 0; y < pattern.length; y++) {
            for (let z = 0; z < pattern[y].length; z++) {
                for (let x = 0; x < pattern[y][z].length; x++) {
                    if (this.patternTypes[pattern[y][z][x]]) {
                        const pos = {
                            x: origin.x + x,
                            y: origin.y + y,
                            z: origin.z + z
                        };
                        const block = dimension.getBlock(pos);
                        if (block) block.setType("minecraft:air");
                        
                        // Yield more frequently
                        if (++count % 5 === 0) yield;
                    }
                }
            }
        }
    }

    static rotateLayer(layer) {
        const rotated = [];
        for (let col = 0; col < layer[0].length; col++) {
            let rowStr = "";
            for (let row = layer.length - 1; row >= 0; row--) {
                rowStr += layer[row][col];
            }
            rotated.push(rowStr);
        }
        return rotated;
    }

    static flipLayerHorizontal(layer) {
        return layer.map(row => row.split('').reverse().join(''));
    }

    static flipLayerVertical(layer) {
        return layer.slice().reverse();
    }

    static flipEntirePattern(pattern) {
        return pattern.map(layer => StructureDetector.flipLayerVertical(layer)).reverse();
    }

    static transposeYZ(pattern) {
        const transposed = [];
        for (let z = 0; z < pattern[0].length; z++) {
            const layer = [];
            for (let y = 0; y < pattern.length; y++) {
                layer.push(([...pattern[y][z]]).join(''));
            }
            transposed.push(layer);
        }
        return transposed;
    }

    static transposeXY(pattern) {
        const transposed = [];
        for (let y = 0; y < pattern.length; y++) {
            const layer = [];
            for (let x = 0; x < pattern[0][0].length; x++) {
                let row = "";
                for (let z = 0; z < pattern[0].length; z++) {
                    row += pattern[y][z][x];
                }
                layer.push(row);
            }
            transposed.push(layer);
        }
        return transposed;
    }
}

export { StructureDetector };
