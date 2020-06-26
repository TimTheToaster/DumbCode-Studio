import { Vector2, Raycaster, EventDispatcher } from "./three.js";
import { isKeyDown } from "./util.js";


document.addEventListener( 'mousemove', onMouseMove, false );
document.addEventListener( 'mousedown', onMouseDown, false );

let mouse = new Vector2(-5, -5);
let mouseClickDown = new Vector2(-5, -5)
let rawMouse = new Vector2();
let mouseDown = false
let mouseOnDiv = false

function onMouseMove( event ) {
    rawMouse.x = event.clientX
    rawMouse.y = event.clientY

    let div = $('#display-div').get(0)
    if(div !== undefined) {
        let rect = div.getBoundingClientRect()
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;
        mouseOnDiv = event.clientX > rect.left && event.clientX < rect.right && event.clientY > rect.top && event.clientY < rect.bottom
    } else {
        mouseOnDiv = false
    }

}

function onMouseDown( event ) {
   mouseDown = true
   mouseClickDown.x = event.clientX
   mouseClickDown.y = event.clientY
}

export function raytraceUnderMouse(camera, elements, recursive = false) {
    raycaster.setFromCamera(mouse, camera)
    return raycaster.intersectObjects(elements, recursive)
}


const selectElementEvent = { type:"select", cubes:[] }
const deselectElementEvent = { type:"deselect", cubes:[] }
const selectChangeEvent = { type:"selectchange", }
const intersectionChangeEvent = { type:"intersection", old:undefined, cube:undefined }

const raycaster = new Raycaster()

export class Raytracer {

    constructor(display, material, highlightMaterial, selectedMaterial) {
        this.material = material
        this.highlightMaterial = highlightMaterial
        this.selectedMaterial = selectedMaterial
        this.display = display
        this.selectedSet = new Set()
        this.intersected
        this.intersectedDistance
        this.disableRaycast = false

        document.addEventListener( 'mouseup', e => {
            mouseDown = false
            let xMove = Math.abs(mouseClickDown.x - event.clientX)
            let yMove = Math.abs(mouseClickDown.y - event.clientY)
        
            if(e.target === display.renderer.domElement && xMove < 5 && yMove < 5 && mouse.x >= -1 && mouse.x <= 1 && mouse.y >= -1 && mouse.y <= 1) {
                if(this.intersected !== undefined) {
                    this.clickOnMesh(this.intersected)
                } else {
                    this.deselectAll()
                }
            }
            
        }, false );

        this.addEventListener('select', e => e.cubes.forEach(mesh => mesh.children.forEach(c => c.material = this.selectedMaterial)))
        this.addEventListener('deselect', e => e.cubes.forEach(mesh => mesh.children.forEach(c => c.material = this.material)))
    }

    anySelected() {
        return this.selectedSet.size > 0
    }

    isSelected(group) {
        return this.selectedSet.has(group)
    }

    isCubeSelected(cube) {
        return this.selectedSet.has(cube.planesGroup)
    }

    firstSelected() {
        return this.selectedSet.values().next().value
    }

    get selected() {
        console.trace("deprecated get")
    }

    set selected(s) {
        console.trace("deprecated set")
    }
    
    clickOnMesh(mesh, toSet, testPrevious = true) {
        if(mesh === undefined) {
            console.trace("deprecated click undefined")
            return
        }
        let shouldRemove = this.selectedSet.has(mesh)
        if(toSet !== undefined) {
            shouldRemove = !toSet
        }
        selectElementEvent.cubes.length = 0
        deselectElementEvent.cubes.length = 0

        if(testPrevious === true && !isKeyDown("Control")) {
            this.selectedSet.forEach(c => deselectElementEvent.cubes.push(c))
            this.selectedSet.clear()
        }
        if(shouldRemove) {
            this.selectedSet.delete(mesh)
            deselectElementEvent.cubes.push(mesh)
        } else {
            this.selectedSet.add(mesh)
            selectElementEvent.cubes.push(mesh)
            this.dispatchEvent(selectElementEvent)
        }

        
        if(deselectElementEvent.cubes.length !== 0) {
            this.dispatchEvent(deselectElementEvent)
        }

        this.dispatchEvent(selectChangeEvent)
    }


    deselectAll() {
        deselectElementEvent.cubes.length = 0
        this.selectedSet.forEach(c => deselectElementEvent.cubes.push(c))
        this.selectedSet.clear()
        this.dispatchEvent(deselectElementEvent)
        this.dispatchEvent(selectChangeEvent)
    }

    mouseOverMesh(mesh, distance = -1) {
        if(mesh !== undefined) {
            if(this.intersected != mesh) {
                if(this.intersected && !this.selectedSet.has(this.intersected)) {
                    this.intersected.children.forEach(c => c.material = this.material)
                }
                intersectionChangeEvent.old = this.intersected
                intersectionChangeEvent.cube = mesh
                this.intersected = mesh
                this.intersectedDistance = distance
                this.dispatchEvent(intersectionChangeEvent)
                
                if(!this.selectedSet.has(this.intersected)) {
                    this.intersected.children.forEach(c => c.material = this.highlightMaterial)
                } 
            } 
        } else if(this.intersected) {
            if(!this.selectedSet.has(this.intersected)) {
                this.intersected.children.forEach(c => c.material = this.material)
            }
            intersectionChangeEvent.old = this.intersected
            intersectionChangeEvent.cube = undefined
            this.intersected = undefined
            this.dispatchEvent(intersectionChangeEvent)
        }
    }

    update() {
        let textDiv = document.getElementById("editor-mouseover") //todo: cache?

        if(this.disableRaycast || !mouseOnDiv) {
            return undefined
        }

        if(this.intersected) {
            let style = textDiv.style
            let divRect = textDiv.getBoundingClientRect()
            textDiv.innerHTML = this.intersected.tabulaCube.name
            style.left = rawMouse.x - divRect.width/2 + "px"
            style.top = rawMouse.y - 35 + "px"
        }

        raycaster.setFromCamera(mouse, this.display.camera);
        

        if(this.display.tbl) {
            let intersects = raycaster.intersectObjects(this.display.tbl.modelCache.children , true);
            if(!mouseDown) {
                if(intersects.length > 0) {
                    this.mouseOverMesh(intersects[0].object.parent, intersects[0].distance)
                    textDiv.style.display = "block"
                } else {
                    this.mouseOverMesh(undefined)
                    textDiv.style.display = "none"
                }
            }
        }
    }

}
Object.assign( Raytracer.prototype, EventDispatcher.prototype );
