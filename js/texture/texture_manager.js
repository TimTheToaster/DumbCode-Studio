import { readFile } from "../displays.js"
import { Texture, NearestFilter, Vector2, DataTexture, RGBAFormat, CanvasTexture } from "../three.js"
import { DraggableElementList, LinkedSelectableList } from "../util.js"

export class TextureManager {

    constructor(model, pth) {
        this.pth = pth
        this.filesPage = pth._files
        this.textures = []
        this.textureUpload = pth._texture._textureUpload

        this.highlightCanvas = document.createElement('canvas')
        this.highlightCanvas.width = model.texWidth
        this.highlightCanvas.height = model.texHeight
        this.highlightContext = this.highlightCanvas.getContext('2d')
        this.highlightContext.imageSmoothingEnabled = false
        this.highlighPixel = null

        model.addEventListener('textureSizeChanged', e => {
            this.highlightCanvas.width = e.width
            this.highlightCanvas.height = e.height
            this.highlightContext = this.highlightCanvas.getContext('2d')
            this.highlightContext.imageSmoothingEnabled = false
        })

        this.canvas = document.createElement('canvas')
        this.context = this.canvas.getContext('2d')
        this.context.imageSmoothingEnabled = false

        this.dragElementList = new DraggableElementList(false, (a, b, c) => this.textureDragged(a, b, c))
        this.selectedLayer = new LinkedSelectableList($(),false).onchange(e => {
            let layer = this.textures[e.value]
            if(layer) {
                this.highlightCanvas.width = layer.width
                this.highlightCanvas.height = layer.height
            }
        })
    }

    getSelectedLayer() {
        return this.textures[this.selectedLayer.value]
    }

    hightlightPixelBounds(u, v, bounds) {
        if(this.selectedLayer.value === undefined) {
            return
        }
        let layer = this.textures[this.selectedLayer.value]
        let pixel = u === undefined ? null : { u: Math.floor(u*layer.width), v:Math.floor(v*layer.height) }
        if(this.highlighPixel?.u === pixel?.u && this.highlighPixel?.v === pixel?.v) {
            return
        }

        this.highlightContext.clearRect(0, 0, this.highlightCanvas.width, this.highlightCanvas.height)

        this.highlighPixel = pixel
        if(this.highlighPixel !== null) {
            this.highlightContext.fillStyle = "rgba(150, 100, 200, 1)"

            if(bounds) {
                bounds.forEach(b => this.highlightContext.fillRect(Math.floor(b.u), Math.floor(b.v), Math.round(b.w), Math.round(b.h)))
            }
        }
        this.refresh()
    }


    textureDragged(drop, movedData, droppedOnData) {
        this.textures.splice(droppedOnData + (drop == 'bottom' ? 1 : 0), 0, ...this.textures.splice(movedData, 1))
        this.refresh()
    }
    
    addImage(name, img) {
        let width = this.pth.model.texWidth
        let height = this.pth.model.texHeight

        let empty = false

        if(name === undefined) {
            name = "New Layer " + this.textures.length
            img = document.createElement("img")
            empty = true
        } else {
            width = img.naturalWidth
            height = img.naturalHeight
        }

        let data = {}

        let li = document.createElement('li')
        data.li = li
        this.selectedLayer.addElement($(li))
        data.name = name
        data.isHidden = false
        this.dragElementList.addElement(li, () => data.idx)
        li.oncontextmenu = () => {
            data.isHidden = !data.isHidden
            li.classList.toggle('entry-hidden', data.isHidden)
            this.refresh()
            return false
        }
        li.classList.add('texture-file-entry')
        li.draggable = true

        data.width = width
        data.height = height
        data.img = img

        data.onCanvasChange = () => {
            data.img.src = data.canvas.toDataURL()
            data.img.width = data.canvas.width
            data.img.height = data.canvas.height
            this.refresh()
        }
        
        data.canvas = document.createElement("canvas")
        data.canvas.width = width
        data.canvas.height = height
        let ctx = data.canvas.getContext("2d")
        ctx.imageSmoothingEnabled = false

        if(empty) {
            ctx.fillStyle = "rgba(255, 255, 255, 1)"
            ctx.fillRect(0, 0, width, height)
        } else {
            ctx.drawImage(img, 0, 0, width, height)
        }

        data.onCanvasChange()

        this.textures.unshift(data)

        return data
    }

    refresh() {
        this.filesPage.textureProjectPart.refreshTextureLayers()

        this.textureUpload.siblings().detach()
        this.textures.forEach((t, id) => {
            t.idx = id
            t.li.setAttribute('select-list-entry', t.idx)
            $(t.li).text(t.name).detach().insertBefore(this.textureUpload)
        })

        let width = this.textures.filter(t => !t.isHidden).map(t => t.width).reduce((a, c) => Math.abs(a * c) / this.gcd(a, c), 1)
        let height = this.textures.filter(t => !t.isHidden).map(t => t.height).reduce((a, c) => Math.abs(a * c) / this.gcd(a, c), 1)

        if(this.textures.length === 0) {
            width = this.pth.model.texWidth
            height = this.pth.model.texHeight
        }

        this.canvas.width = width
        this.canvas.height = height
        this.context.imageSmoothingEnabled = false

        if(!this.textures.find(t => !t.isHidden)) {
            this.context.fillStyle = `rgba(255, 255, 255, 1)`
            this.context.fillRect(0, 0, width, height)
        }

        this.textures.filter(t => !t.isHidden).reverse().forEach(t => this.context.drawImage(t.canvas, 0, 0, width, height))

        if(this.selectedLayer.value !== undefined) {
            this.context.drawImage(this.highlightCanvas, 0, 0, width, height)
        }

        let tex = new CanvasTexture(this.canvas)
        tex.needsUpdate = true
        tex.flipY = false
        tex.magFilter = NearestFilter;
        tex.minFilter = NearestFilter;
        this.pth.setTexture(tex)
        
    }

    gcd(a, b) {
        if (!b) {
          return Math.abs(a);
        }
      
        return this.gcd(b, a % b);
      }
}
