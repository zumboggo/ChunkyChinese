export function visualNovel(config:unknown,resource:string,actors:number[][],anims:number[][],sceneIds:number[][]):{
 reaction(ctx:CanvasRenderingContext2D,id:number,time:number,scale?:number):void;
 render(ctx:CanvasRenderingContext2D,scene:unknown,state:string,time:number,backgroundTime:number):void;
};
