import { readFile } from "../displays.js"
import { DraggableElementList, doubleClickToEdit, downloadCanvas, downloadHref, fileUploadBox } from "../util.js"

export class TextureProjectPart {

    constructor(dom, pth) {
        this.pth = pth
        this.emptyTextureList = dom.find('.texture-list-entry.empty-column')
        this.dragableElementList = new DraggableElementList(false, (a, b, c) => pth.textureManager.textureDragged(a, b, c))
        dom.find('#texture-file-input').on('input', e => this.uploadTextureFile(e.target.files))
        dom.find('.new-texture-button').click(() => this.createEmptyTexture())

        fileUploadBox(dom.find('.texture-drop-area'), files => this.uploadTextureFile(files))
     
        pth.addEventListener('selectchange', () => this.refreshTextureLayers())
    }

    createEmptyTexture() {
        this.createTextureElement()
        this.pth.textureManager.refresh()
    }
    
    createTextureElement(name, img) {
        let data = this.pth.textureManager.addImage(name, img)
        let cloned = this.emptyTextureList.clone()
        cloned.removeClass('empty-column')
        cloned.insertBefore(this.emptyTextureList)    

        cloned.find('.texture-preview').append(data.img)

        let element = cloned.get(0)
        element.draggable = true

        data._projectElement = cloned
        this.dragableElementList.addElement(element, () => data.idx)

        doubleClickToEdit(cloned.find('.texture-name-container'), name => {
            data.name = name
            data.li.innerText = name
        }, data.name)

        cloned.find('.download-texture-file').click(() => downloadCanvas(data.name + ".png", data.canvas))
    }

    async uploadTextureFile(files) {
        Promise.all([...files].map(file => {
            let img = document.createElement("img")
            return new Promise(async(resolve) => {
                img.src = await readFile(file, (reader, f) => reader.readAsDataURL(f))
                img.onload = () => { 
                    resolve({ name: file.name, img })
                    img.onload = null
                 }
            })
        }))
        .then(files => files.forEach(file => this.createTextureElement(file.name, file.img)))
        .then(() => this.pth.textureManager.refresh())
    }

    refreshTextureLayers() {
        this.emptyTextureList.siblings().not('.texture-layer-topbar').detach()
        this.pth.textureManager.textures.forEach(t => {
            let e = t._projectElement
            if(e === undefined) {
                console.error("Layer created without project element " + JSON.stringify(t))
                return
            }
            e.insertBefore(this.emptyTextureList)
        })

    }
}