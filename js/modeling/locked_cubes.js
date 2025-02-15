import { CubeLocker } from "../util.js"

export class LockedCubes {
    constructor(studio) {
        this.pth = studio.pth

        let transformControls  = studio.transformControls 
        this.raytracer = studio.raytracer

        this.lockedChildrenCache = new Map()
        this.movingChildrenCache = new Set()

        transformControls.addEventListener('objectChange', () => this.reconstructLockedCubes())
        transformControls.addEventListener('mouseUp', () => {
            this.lockedChildrenCache.clear()
            this.movingChildrenCache.clear()
        })
        transformControls.addEventListener('mouseDown', () => this.createLockedCubesCache())

    }

    get lockedCubes() {
        return this.pth.lockedCubes
    }

    lock(cube) {
        this.lockedCubes.add(cube.name)
    }

    unlock(cube) {
        this.lockedCubes.delete(cube.name)
    }

    isLocked(cube) {
        return this.lockedCubes.has(cube.name)
    }

    addToLocker(cube, type) {
        this.addToHierarchyMap(this.lockedChildrenCache, cube.hierarchyLevel, new CubeLocker(cube, type))
    }

    createLockedCubesCache(lockedCubes = this.lockedCubes, directMove = false) {
        this.lockedChildrenCache.clear()
        this.movingChildrenCache.clear()
        lockedCubes.forEach(cubeName => {
            let cube = this.pth.model.cubeMap.get(cubeName)
            if(!cube || (directMove !== true && this.raytracer.isCubeSelected(cube))) {
                return
            } 
            this.traverseUnlockedCubes(cube)
            if(!this.isLocked(cube.parent)) {
                this.addToHierarchyMap(this.lockedChildrenCache, cube.hierarchyLevel, new CubeLocker(cube))
            }
        })
    }

    traverseUnlockedCubes(cube) {
        if(this.isLocked(cube)) {
            cube.children.forEach(child => this.traverseUnlockedCubes(child))
        } else if(this.isLocked(cube.parent)) {
            this.movingChildrenCache.add(cube)
        }
    }

    reconstructLockedCubes(movingCubes = true) {
        this.pth.model.modelCache.updateMatrixWorld(true)

        //Moving cubes are cubes that SHOULD move but at some point a parent is locked preventing them from moving
        let movingCubesCache = new Map()
        if(movingCubes === true) {
            this.movingChildrenCache.forEach(cube => this.addToHierarchyMap(movingCubesCache, cube.hierarchyLevel, new CubeLocker(cube)))
        }

        let size = Math.max(Math.max(...this.lockedChildrenCache.keys()), Math.max(...movingCubesCache.keys()))
                
        //We need to compute everything in order so the parents matrixWorld is correct
        for(let i = 0; i <= size; i++) {
            this.lockedChildrenCache.get(i)?.forEach(lock => {
                lock.reconstruct()
                lock.cube.cubeGroup.updateMatrixWorld(true)
            })

            movingCubesCache.get(i)?.forEach(lock => {
                lock.reconstruct()
                lock.cube.cubeGroup.updateMatrixWorld(true)
            })
        }
  
        // this.lockedChildrenCache.clear()
        // this.movingChildrenCache.clear()
    }

    addToHierarchyMap(map, level, cubeLocker) {
        if(map.has(level)) {
            map.get(level).push(cubeLocker)
        } else {
            map.set(level, [cubeLocker])
        }
    }

}