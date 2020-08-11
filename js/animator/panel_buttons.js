export class PanelButtons {
    constructor(dom, studio) {
        // dom.find('.button-add-keyframe').click(() => {
        //     let handler = studio.animationTabHandler.active
        //     if(handler !== null) {
        //         let kf = handler.createKeyframe()
        //         kf.duration = 5
        //         kf.startTime = studio.keyframeManager.playstate.ticks
        //         handler.keyframes.push(kf)
        //         handler.keyframesDirty()
        //         studio.keyframeManager.reframeKeyframes()
        //         kf.selectChange(true)
        //     }
        // })

        dom.find('.button-delete-keyframe').click(() => {
            let handler = studio.animationTabHandler.active
            if(handler !== null && handler.selectedKeyFrame !== undefined) {
                let index = handler.keyframes.indexOf(handler.selectedKeyFrame)
                if(index >= 0) {
                    let keyframe = handler.selectedKeyFrame
                    handler.keyframes.splice(index, 1)
                    handler.keyframesDirty()
                
                    studio.selectKeyframe(undefined)
                    studio.keyframeManager.reframeKeyframes()
                }
            }
        })

        let playstateRoot = dom.find('.toggle-timeline-playstate')
        let updatePlaystate = () => {
            let playing = studio.keyframeManager.playstate.playing === true
            playstateRoot.find('.play-pause-symbol').toggleClass('fa-pause', playing).toggleClass('fa-play', !playing)
        }


        dom.find('.button-restart-time').click(() => {
            studio.keyframeManager.playstate.ticks = 0
            studio.keyframeManager.playstate.playing = true
            updatePlaystate()
        })
        dom.find('.button-reset-time').click(() => {
            studio.keyframeManager.playstate.ticks = 0
            studio.keyframeManager.playstate.playing = false
            updatePlaystate()
        })

        playstateRoot.click(() => {
            let playing = studio.keyframeManager.playstate.playing === true
            studio.keyframeManager.playstate.playing = !playing
            updatePlaystate()
        })

        let inputSpeedSlider = dom.find('.input-playback-speed')
        inputSpeedSlider.on('input', e => {
            let value = Math.round(Math.pow(2, e.target.value) * 10) / 10
            inputSpeedSlider.parent().attr('data-tooltip', 'Speed: ' + (value === 1 ? 'Normal' : 'x ' + value))
            studio.keyframeManager.playstate.speed = value
        })

        
        let startTimeField = dom.find('.input-keyframe-starttime')

        startTimeField.on('input', e => {
            let value = Math.max(Number(e.target.value), 0)
            let handler = studio.animationTabHandler.active

            if(handler !== null && !isNaN(value) && handler.selectedKeyFrame !== undefined) {
                handler.selectedKeyFrame.startTime = value
                handler.keyframesDirty()
                studio.keyframeManager.updateKeyFrame(handler.selectedKeyFrame)
            }
        })


        dom.find('.input-keyframe-duration').on('input', e => {
            let value = Math.max(Number(e.target.value), 0)
            let handler = studio.animationTabHandler.active
            
            if(handler !== null && !isNaN(value) && handler.selectedKeyFrame !== undefined) {
                let diff = value - handler.selectedKeyFrame.duration
                handler.selectedKeyFrame.duration = value
                handler.selectedKeyFrame.startTime -= diff
                startTimeField.val(handler.selectedKeyFrame.startTime)
                handler.keyframesDirty()
                studio.keyframeManager.updateKeyFrame(handler.selectedKeyFrame)
            }
        })
    }
}