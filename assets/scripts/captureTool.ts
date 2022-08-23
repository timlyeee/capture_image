import { _decorator, Component, Node, RenderTexture, director, Director, Camera, native, renderer, Label, Root, Sprite, SpriteFrame, resources, assetManager, ImageAsset, Texture2D, Light, Color, Quat, UITransform, Vec2, Size } from 'cc';
import { HTML5, NATIVE, PREVIEW } from 'cc/env';
const { ccclass, property } = _decorator;

@ccclass('captureTool')
export class captureTool extends Component {
    public _width;
    public _height;
    public shouldFlipX: boolean = false;
    public shouldFlipY: boolean = false;
    static _renderTex : RenderTexture | null = null;
    @property(Sprite)
    public sprite : Sprite | null = null;
    @property(Light)
    public mainLight: Light | null = null;
    @property(Camera)
    public cam: Camera | null = null;
    @property(Node)
    public cube: Node;

    public rotateQuat = new Quat(0,0,60);
    start() {
        let caps =  director.root.device.capabilities;
        let info = `clip space minz : ${caps.clipSpaceMinZ}, clip space signY: ${caps.clipSpaceSignY} screen space signY: ${caps.screenSpaceSignY}`;
        console.log(info);
        if (caps.clipSpaceMinZ == -1) {
            this.shouldFlipX = true;
        }
        if (caps.clipSpaceSignY == -1) {
            this.shouldFlipY = true;
        }
        
    }

    update(deltaTime: number) {
        this.cube.rotate(this.rotateQuat);
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
                var rt = new RenderTexture();
                // renderTexture.initialize(renderWindowInfo);
                rt.reset({
                    width: this._width,
                    height: this._height
                });
                
                cameras.forEach((camera: any) => {
                    camera.targetTexture = rt;
                });
                await this.waitForNextFrame();
                cameras.forEach((camera: any) => {
                    camera.targetTexture = null;
                });
                let pixelData = rt.readPixels();
                if (this.shouldFlipX) {
                    pixelData = this.flipImageX(pixelData);
                }
                if (this.shouldFlipY) {
                    pixelData = this.flipImageY(pixelData);
                }
                rt.destroy();
                resolve(pixelData);
            }
            else{
                reject("no camera found");
            }
        });
    }

    flipImageX(data:Uint8Array){
        //图片数组纵向翻转
        let newData = new Uint8Array(data.length);
        for(let i = 0; i < this._height; i++){
            for(let j = 0; j < this._width; j++){
                let index = (this._width * i + j) * 4;
                let newIndex = (this._width * (this._height - i - 1) + j) * 4;
                newData[newIndex] = data[index];
                newData[newIndex + 1] = data[index + 1];
                newData[newIndex + 2] = data[index + 2];
                newData[newIndex + 3] = data[index + 3];
            }
        }
        return newData;
    }
    flipImageY(data: Uint8Array) {
        //图片数组横向翻转
        let newData = new Uint8Array(data.length);
        for(let i = 0; i < this._height; i++){
            for(let j = 0; j < this._width; j++){
                let newIndex = (this._width * i + j) * 4;
                let index =(this._width - j + i * this._width) * 4;
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
                let filePath = native.fileUtils.getWritablePath();;
                native.saveImageData(data, this._width, this._height, filePath+'capture.png', (isSuccess: boolean)=>{
                    if (isSuccess) {
                        console.log("save success");
                        this.setSpriteFrameWithImage(filePath+'capture.png');
                        
                        // this.mainLight.color = Color.BLUE;
                    } else {
                        console.log("save fail");
                    }
                }).then(()=>{
                    console.log("Result of save image data is true");
                }).catch(()=>{
                    console.log("Fail to save image data");
                });
                
                native.saveImageData(data, this._width, this._height, filePath+'capture.jpg', (isSuccess: boolean)=>{
                    if (isSuccess) {
                        console.log("save success");
                    } else {
                        console.log("save fail");
                    }
                });
            }
            this.cam.clearColor = Color.WHITE;  
        }).catch((err)=>{
            console.log(err);
        });
        
    }

    setSpriteFrameWithImage(imagePath: string) {
        const spriteFrame = this.sprite.spriteFrame!;
        assetManager.loadRemote(imagePath, (err, image: ImageAsset)=>{
            const sp = new SpriteFrame();
            var t2d = new Texture2D();
            t2d.image = image;
            sp.texture = t2d;
            this.sprite.node.getComponent(UITransform).contentSize = new Size(this._width, this._height);
            this.sprite.spriteFrame = sp;
            console.log("Load success");
        });

    }

}
