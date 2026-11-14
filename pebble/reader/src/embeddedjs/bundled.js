import io from './native';
const meta={"chinese":false,"textVersion":"2a1cec814aef","format":1,"id":"supportive-13","version":"6b319cc93962","title":"What Do You Want?","shortTitle":"What Do You Want?","number":13,"cover":"Gorgon-neutral-full","entry":0,"nodeCount":84};
let index=-1,node;meta.nodeAt=i=>{if(i<0||i>=meta.nodeCount)return undefined;if(index!==i){node=JSON.parse(io.readStoryNode(i));index=i;}return node;};export default meta;
