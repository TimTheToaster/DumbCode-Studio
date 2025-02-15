import { BackSide, BoxBufferGeometry, BufferGeometry, CircleGeometry, Clock, Color, DirectionalLight, DoubleSide, Euler, Float32BufferAttribute, Group, HemisphereLight, Line, LineBasicMaterial, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, OrthographicCamera, PerspectiveCamera, Raycaster, Scene, SphereGeometry, Vector2, Vector3 } from "./libs/three.js"

const width = 75
const height = 75

const geometry = new SphereGeometry(0.15)

const lineGeometry = new BufferGeometry()
lineGeometry.addAttribute('position', new Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0], 3))

const material = new MeshBasicMaterial({side: DoubleSide})
const lineMaterial = new LineBasicMaterial()

const _vec3 = new Vector3()
const raycaster = new Raycaster()
const _raycastArray = []

const transitionClock = new Clock()
const transitionTime = 1;
const startTarget = new Vector3()
const startPosition = new Vector3()
const transitionTarget = new Vector3()
const transitionPosition = new Vector3()

export class DirectionalIndecators {
    constructor(displays, controls) {
        this.displays = displays
        this.controls = controls
        this.circles = new Group()
        this.scene = new Scene()

        this.scene.add(this.circles)
  
        this.camera = new OrthographicCamera(-width/2, width/2, -height/2, height/2)
        this.camera.zoom = 40
        this.camera.updateProjectionMatrix()

        this.indicators = $('#directional-indicators')
        this.indicators.css('display', 'block')
        this.indX = this.createCicleMesh(-1, 0, 0, 0xFF0000, 'x')
        this.createCicleMesh( 1, 0, 0, 0x7F0000)
        this.createLine(0, 0, 0x570000)

        this.indY = this.createCicleMesh(0,  -1, 0, 0x00FF00, 'y')
        this.createCicleMesh(0, 1, 0, 0x007F00)
        this.createLine(0, Math.PI/2, 0x005700)

        this.indZ = this.createCicleMesh(0, 0, -1, 0x0000FF, 'z')
        this.createCicleMesh(0, 0, 1, 0x00007F)
        this.createLine(Math.PI/2, 0, 0x000057)

        this.indicators.css('display', '')

        $(document).keydown(e => {
            if(document.activeElement.nodeName == "INPUT") {
                return
            }
            let key = e.keyCode
            if(key >= 96 && key <= 105) {
                let num = key - 96
                if(!e.ctrlKey) {
                    switch (num) {
                        case 2:
                            this.startTransition(0, -1, 0)
                            break;
                        case 4:
                            this.startTransition(-1, 0, 0)
                            break;
                        case 5:
                            this.startTransition(0, 0, 1)
                            break;
                        case 6:
                            this.startTransition(1, 0, 0)
                            break;
                        case 8:
                            this.startTransition(0, 1, 0)
                            break;
                        default:
                            return
                    }
                } else if(num == 5) {
                    this.startTransition(0, 0, -1)
                } else {
                    return
                }
                e.preventDefault()
                e.stopPropagation()
            }
        })

    }

    domFinished() {
        this.displays.mousedown.addListener(0, e => {
            _vec3.x = 2 * (e.offsetX - this.displays.drawWidth) / width + 1
            _vec3.y = -2 * (e.offsetY - this.displays.drawHeight) / height - 1
            if(Math.abs(_vec3.x) < 1 && Math.abs(_vec3.y) < 1) {
                raycaster.setFromCamera(_vec3, this.camera)
                _raycastArray.length = 0
                raycaster.intersectObject(this.circles, true, _raycastArray)
                if(_raycastArray.length != 0) {
                    let pos = _raycastArray[_raycastArray.length-1].object.position
                    
                    this.startTransition(-pos.x*2, -pos.y*2, -pos.z*2)

                }
                e.consume()
            }
        })
    }

    startTransition(x, y, z) {
        startPosition.copy(this.displays.camera.position)
        startTarget.copy(this.controls.target)

        let yTarget = y < 0 ? 0 : 1.5

        transitionPosition.set(x, y, z).multiplyScalar(5).add(_vec3.set(0.5, yTarget, 0.5)).sub(startPosition)
        transitionTarget.set(0.5, yTarget, 0.5).sub(startTarget)

        transitionClock.start()
    }

    createCicleMesh(x, y, z, color, value) {
        let mat = material.clone()
        mat.color = new Color(color)

        let mesh = new Mesh(geometry, mat)
        mesh.position.set(x/2, y/2, z/2)
        this.circles.add(mesh)

        if(value !== undefined) {
            mesh.indicator = this.indicators.find(`div[attribute=${value}]`)
            mesh._hw = mesh.indicator.innerWidth()/2
            mesh._hh = mesh.indicator.innerHeight()/2
        }
        
        return mesh
    }

    createLine(x, y, color) {
        let mat = lineMaterial.clone()
        mat.color = new Color(color)

        let mesh = new Line(lineGeometry, mat)
        mesh.rotation.set(0, x, y)

        this.scene.add(mesh)
    }

    draw() {
        this.offTop = this.displays.renderer.context.canvas.offsetTop
        this.offLeft = this.displays.renderer.context.canvas.offsetLeft
        this.updatePart(this.indX)
        this.updatePart(this.indY)
        this.updatePart(this.indZ)
        if(transitionClock.running) {
            let d = transitionClock.getElapsedTime() / transitionTime
            if(d < 1) {
                this.displays.camera.position.copy(transitionPosition).multiplyScalar(d).add(startPosition)
                this.controls.target.copy(transitionTarget).multiplyScalar(d).add(startTarget)
                this.displays.dontReRender = true
                this.controls.update()
                this.displays.dontReRender = false
            } else {
                transitionClock.stop()
            }
        }
        this.circles.children.forEach(c => c.lookAt(this.camera.position))
        this.displays.camera.getWorldDirection(this.camera.position)
        this.camera.lookAt(0, 0, 0)

        this.displays.renderer.setViewport(this.displays.drawWidth - width, 0, width, height)
        this.displays.renderer.clearDepth()
        this.displays.renderer.render(this.scene, this.camera);
        this.displays.renderer.setViewport(0, 0, this.displays.drawWidth, this.displays.drawHeight)
    }

    updatePart(indicator) {
        let ret = this.displays.toScreenPosition(indicator, this.camera)
        ret.x = ret.x*width + this.displays.drawWidth - width
        ret.y = ret.y*height + this.displays.drawHeight - height

        let indc = indicator.indicator
        indc.css('left', `${ret.x + this.offLeft - indicator._hw}px`)
            .css('top', `${ret.y + this.offTop -  indicator._hh}px`)
    }
}
