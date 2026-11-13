import io from './native';
const meta={"format":1,"id":"supportive-12","version":"8c071e11b3d4","title":"好人是我？ · The Nice One","shortTitle":"The Nice One","number":12,"cover":"Alden-thoughtful-full","entry":0,"nodeCount":61};
let index=-1,node;meta.nodeAt=i=>{if(i<0||i>=meta.nodeCount)return undefined;if(index!==i){node=JSON.parse(io.readStoryNode(i));index=i;}return node;};export default meta;
