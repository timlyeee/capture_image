import { _decorator, Component, Node, RenderTexture, director, Director, Camera, native, renderer, Label, Root } from 'cc';
import { HTML5, NATIVE, PREVIEW } from 'cc/env';
const { ccclass, property } = _decorator;

@ccclass('captureTool')
export class captureTool extends Component {
    public _width;
    public _height;
    public shouldFlip: boolean;
    @property(Label)
    public label : Label | null = null;
    start() {
        let caps =  director.root.device.capabilities;
        let info = `clip space minz : ${caps.clipSpaceMinZ}, clip space signY: ${caps.clipSpaceSignY} screenSpaceSignY: ${caps.screenSpaceSignY}`;
        console.log(info);
        this.label.string = info;
        if (caps.clipSpaceSignY == 1) {
            this.shouldFlip = true;
        }
    }

    update(deltaTime: number) {
        
    }
    async waitForNextFrame() {
        return new Promise<void>((resolve, reject) => {
            director.once(Director.EVENT_END_FRAME, () => {
                resolve();
            });
        });
    }
    captureWholeScreen(): Promise<Uint8Array> {
        return new Promise<any>(async (resolve, reject)=>{
            this._width = screen.width;
            this._height = screen.height;
            // Choose cameras to use
            const cameras = this.node.getComponentsInChildren(Camera);
            if (cameras.length != 0) {
                let renderTexture = new RenderTexture();
                
                let renderWindowInfo = {
                    width: this._width,
                    height: this._height
                };
                // renderTexture.initialize(renderWindowInfo);
                renderTexture.reset(renderWindowInfo);
                
                cameras.forEach((camera: any) => {
                    camera.targetTexture = renderTexture;
                });
                await this.waitForNextFrame();
                cameras.forEach((camera: any) => {
                    camera.targetTexture = null;
                });
                let pixelData = renderTexture.readPixels();
                if (this.shouldFlip) {
                    pixelData = this.flipImage(pixelData);
                }
                // renderTexture.destroy();
                resolve(pixelData);
            }
            else{
                reject("no camera found");
            }
        });
    }

    flipImage(data:Uint8Array){
        //flip image with array from top to down
        let newData = new Uint8Array(data.length);
        for(let i = 0; i < this._width; i++){
            for(let j = 0; j < this._height; j++){
                let index = (this._width * j + i) * 4;
                let newIndex = (this._width * (this._height - j - 1) + i) * 4;
                newData[newIndex] = data[index];
                newData[newIndex + 1] = data[index + 1];
                newData[newIndex + 2] = data[index + 2];
                newData[newIndex + 3] = data[index + 3];
            }
        }
        return newData;
    }
    onCaptureSavedClick() {
        const imageData = this.captureWholeScreen();
        imageData.then((data) => {
            if (PREVIEW || HTML5) {
                const canvas = document.createElement("canvas");
                canvas.width = screen.width;
                canvas.height = screen.height;
                const context = canvas.getContext("2d");
                let imageData = context.createImageData(this._width, this._height);
                imageData.data.set(data);
                context.putImageData(imageData, 0, 0);
                canvas.toBlob((blob) => {
                    let newImage = document.createElement("img");
                    let url = URL.createObjectURL(blob);
                    newImage.onload = () => {
                        const urlObject = window.URL || window.webkitURL || window;
                        URL.revokeObjectURL(url);
                        const save_link = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
                        save_link.href = urlObject.createObjectURL(blob);
                        save_link.download = 'capture.png';
                        save_link.click();
                    };
                    newImage.src = url;
                    // document.body.appendChild(newImage);

                });
            } else if (NATIVE) {
                console.log("Capture image on native");
                let fileName = 'capture.png';
                let filePath = native.fileUtils.getWritablePath();
                let fullFileName = filePath + fileName;
                native.saveImageData(data, this._width, this._height, fullFileName, (isSuccess: boolean)=>{
                    if (isSuccess) {
                        console.log("save success");
                    } else {
                        console.log("save fail");
                    }
                });
                native.saveImageData(data, this._width, this._height, filePath+'captureJpg.jpg', (isSuccess: boolean)=>{
                    if (isSuccess) {
                        console.log("save success");
                    } else {
                        console.log("save fail");
                    }
                });
            }  
        }).catch((err)=>{
            console.log(err);
        });
    }

}

