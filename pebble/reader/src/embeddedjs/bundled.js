import io from './native';
const meta={"format":1,"id":"supportive-11","version":"73281f5e8202","title":"还可以更好 · We Could Do Better","shortTitle":"We Could Do Better","number":11,"entry":0,"nodeCount":88};
let index=-1,node;meta.nodeAt=i=>{if(i<0||i>=meta.nodeCount)return undefined;if(index!==i){node=JSON.parse(io.readStoryNode(i));index=i;}return node;};export default meta;
