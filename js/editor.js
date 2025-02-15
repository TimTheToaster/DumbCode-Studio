import { PerspectiveCamera, WebGLRenderer, Scene, Color, HemisphereLight, DirectionalLight, NearestFilter, LinearMipMapLinearFilter, MeshLambertMaterial, DoubleSide, OrthographicCamera, Texture, Quaternion, Group, AmbientLight } from "./libs/three.js";
import { DinosaurDisplay, readFile } from "./displays.js";
import { OrbitControls } from './libs/orbit_controls.js'
import { TransformControls } from './libs/transform_controls.js'
import { ProjectTabs } from "./project_tabs.js";
import { AnimationStudio } from "./animator/animation_studio.js";
import { ModelingStudio } from "./modeling/modeling_studio.js";
import { FilesPage } from "./project/files_page.js";
import { Raytracer } from "./raytracer.js";
import { TextureStudio } from "./texture/texture_studio.js";
import { DCMModel } from "./formats/model/dcm_model.js";
import { ProjectTabHandler } from "./project_tab_handler.js";
import { DirectionalIndecators } from "./directional_indicators.js";
import { StudioOptions } from "./studio_options.js";

const major = 0
const minor = 8
const patch = 8

const version = `${major}.${minor}.${patch}`
document.getElementById("dumbcode-studio-version").innerText = `v${version}`

let canvasContainer = undefined //document.getElementById("display-div");
const mainArea = document.getElementById("main-area")
const display = new DinosaurDisplay()

let controls

const tabEventTypes = ['keydown']

// let material = new MeshLambertMaterial( {
//     color: 0x777777,
//     transparent: true,
//     side: DoubleSide,
//     alphaTest: 0.0001,
// } )


// let highlightMaterial = material.clone()
// highlightMaterial.emissive.setHex( 0xFF0000 )

// let selectedMaterial = material.clone()
// selectedMaterial.emissive.setHex( 0x0000FF )

const pth = new ProjectTabHandler(display)


const raytracer = new Raytracer(display, pth)

const projectTabs = new ProjectTabs()

let directionalIndecators

let activeTab
let studioOptions
let filesPage, modelingStudio, textureStudio, animationStudio

let allTransformControls = []

async function init() {
    //Set up the renderer
    var renderer = new WebGLRenderer( { antialias: true, alpha: true } );
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0);


    //Set up the camera
    let camera = new PerspectiveCamera( 65, 1, 0.1, 700 )
    camera.position.set(0.45, 1.5, 4.5)
    camera.lookAt(0.5, 1.5, 0.5)

    let onTop = createScene()
    onTop.background = null;

    //Set up the controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0.5, 0, 0.5)
    controls.screenSpacePanning = true
    controls.update()

    //When an input is focused on don't allow for keyboard controls.
    $(document)
    .click(e => {
        if(e.target !== document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur()
        }
    })
    .focusin(e => e.target.nodeName == "INPUT" ? controls.enableKeys = false : 0)
    .focusout(e => e.target.nodeName == "INPUT" ? controls.enableKeys = true : 0)
    .keydown(e => {
        if(document.activeElement.nodeName == "INPUT") {
            return
        }
        if(e.ctrlKey) {
            const angle = 0.0872665 //5 degrees
            switch (e.keyCode) {
                case 98: //num2
                    controls.rotateUp(-angle)
                    break;
                case 100: //num4
                    controls.rotateLeft(angle)
                    break;
                case 102: //num6
                    controls.rotateLeft(-angle)
                    break;
                case 104: //num8
                    controls.rotateUp(angle)
                    break;
                default:
                    return
            }
            controls.update()
            e.stopPropagation()
        }
    })
    
    directionalIndecators = new DirectionalIndecators(display, controls)

    display.setup(renderer, camera, createScene(), onTop, directionalIndecators)

    display.createTransformControls = () => {
        let transformControls = new TransformControls(camera, renderer.domElement)
        transformControls.setSize(1.25)
        allTransformControls.push(transformControls)
        transformControls.addEventListener('dragging-changed', e => {
            controls.enabled = !e.value;
        });
        transformControls.addEventListener('axis-changed', e => {
            let textDiv = document.getElementById("editor-mouseover")
            if(e.value === null) {
                textDiv.style.display = "block"
                raytracer.disableRaycast = false
            } else {
                textDiv.style.display = "none"
                raytracer.disableRaycast = true
            }
        })
        transformControls.space = "local"
        raytracer.addEventListener('clicked', e => e.ignore = e.ignore || (transformControls.dragging && transformControls.axis !== null))
        return transformControls
    }

    display.renderTopGroup = new Group()
    display.onTopScene.add(display.renderTopGroup)
}

window.onModulesFinished = async() => {

    studioOptions = new StudioOptions($(document), raytracer, pth, display, setCamera, renameCube)
    display.studioOptions = studioOptions

    filesPage = createFilesPage()
    animationStudio = createAnimationStudio()
    modelingStudio = createModelingStudio()
    textureStudio = createTextureStudio()

    pth.inititateTabs(filesPage, modelingStudio, textureStudio, animationStudio)

    tabEventTypes.forEach(type => document.addEventListener(type, event => activeTab.dispatchEvent( { type, event } )))

    directionalIndecators.domFinished()
    $('.display-div').mousedown(e => display.mousedown.fireEvent(e))

    //Fix bulma dropdown boxes
    $('.dropdown:not(.is-hoverable) .dropdown-menu').get().forEach(t => $(t).click(e => {
        if(e.target.nodeName === "INPUT" && t.parentNode.classList.contains('is-active')) {
            e.stopPropagation()
        }
    }))
    

    frame()
}

window.onbeforeunload = function() { 
    return "Some changes may be unsaved, would you like to leave the page?";
}; 

export function createScene() {
    //Set up the Scene
    let scene = new Scene();
    scene.background = new Color(0x363636);

    //Set up lighting
    scene.add( new AmbientLight( 0xffffff ))

    let createLight = (x, y, z, i) => {
        let light = new DirectionalLight()
        light.position.set(x, y, z)
        light.intensity = i
        scene.add(light)
    } 

    createLight(1, 0, 0, 0.2)
    createLight(-1, 0, 0, 0.2)
    createLight(0, 1, 0, 0.8)
    createLight(0, 0, 1, 0.6)
    createLight(0, 0, -1, 0.6)
    
    return scene
}

function frame() {
    let newTab = projectTabs.getActive(filesPage, modelingStudio, textureStudio, animationStudio)
    if(newTab !== activeTab && newTab !== undefined) {
        if(activeTab !== undefined) {
            if(activeTab.setUnactive) {
                activeTab.setUnactive()
            }
        }
        if(canvasContainer !== undefined) {
            $(display.renderer.domElement).detach()
        }
        projectTabs.tabs.forEach(t => mainArea.classList.remove("is-"+t))

        mainArea.classList.toggle("is-"+projectTabs.activeTab, true)
        activeTab = newTab

        canvasContainer = $(activeTab.domElement).find(".display-div").get(0)
        if(canvasContainer !== undefined) {
            $(display.renderer.domElement).appendTo(canvasContainer)
        }

        Array.from(document.getElementsByClassName("editor-part")).forEach(elem => {
            elem.classList.toggle("is-active", elem.getAttribute("editor-tab").split(",").includes(projectTabs.activeTab))
        })
        if(activeTab.setActive) {
            activeTab.setActive()
        }
    }
    requestAnimationFrame(frame)
    runFrame()
}

function runFrame() {
    activeTab.runFrame()
}

function renameCube(cube, newValue) {
    if(pth.model.cubeMap.has(newValue)) {
        return true
    }
    let oldValue = cube.name
    if(oldValue !== newValue) {
        cube.updateCubeName(newValue)
        pth.animationTabs.allTabs.forEach(tab => tab.handler.renameCube(oldValue, newValue))
        this.studioOptions.refreshOptionTexts()
    }   
    return false
}

function setCamera(camera) {
    controls.object = camera
    display.camera = camera
    allTransformControls.forEach(tc => tc.camera = camera)
}

export function updateCamera(camera, width, height) {
    if(camera.isPerspectiveCamera) {
        camera.aspect = width / height;
    }

    if(camera.isOrthographicCamera) {
        camera.left = width / -2
        camera.right = width / 2
        camera.top = height / 2
        camera.bottom = height / -2
    }
    camera.updateProjectionMatrix();
}

function createFilesPage() {
    return new FilesPage($('#files-area'), () => modelingStudio, () => textureStudio, () => animationStudio, pth)
}

function createModelingStudio() {
    return new ModelingStudio($('#modeling-area'), display, raytracer, controls, renameCube, pth)
}

function createTextureStudio() {
    return new TextureStudio($('#texture-area'), filesPage, display, raytracer, controls, pth)
}

function createAnimationStudio() {
    return new AnimationStudio($('#animation-area') , raytracer, display, pth)
}

window.addEventListener( 'resize', () => window.studioWindowResized(), false );

window.studioWindowResized = () => {
    if(canvasContainer === undefined) {
        return
    }
    let width = canvasContainer.clientWidth
    let height = canvasContainer.clientHeight
    updateCamera(display.camera, width, height)

    display.setSize(width, height)
}

init()
