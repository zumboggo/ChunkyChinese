// Generated joint tracks; included after primitive math helpers.
static void direct_restaurant(uint32_t t,Pose *child,Pose *hannah){
 switch(scene_id){
 case 2:
  *child=poses[0]; child->gaze=1;
  child->head.y=(t<1800?mix(67,81,ease(((float)t-0)/1800)):81);
  child->shoulder.y=(t<1800?mix(97,111,ease(((float)t-0)/1800)):111);
  child->hip.y=(t<1800?mix(132,146,ease(((float)t-0)/1800)):146);
  child->hand.y=(t<1800?mix(133,147,ease(((float)t-0)/1800)):147);
  child->angle=(t<2400?mix(0.1f,0,ease(((float)t-0)/2400)):0);
  *hannah=poses[1]; hannah->gaze=1;
  hannah->head.y+=sine(t*0.002f)*0.4f;
  break;
 case 3:
  *child=poses[0]; child->gaze=1;
  *hannah=poses[1]; hannah->gaze=1;
  hannah->hand.x=(t<400?mix(115,115,ease(((float)t-0)/400)):(t<1400?mix(115,139,ease(((float)t-400)/1000)):(t<1600?mix(139,139,ease(((float)t-1400)/200)):(t<3000?mix(139,92,ease(((float)t-1600)/1400)):92))));
  hannah->hand.y=(t<400?mix(147,147,ease(((float)t-0)/400)):(t<1400?mix(147,143,ease(((float)t-400)/1000)):(t<1600?mix(143,143,ease(((float)t-1400)/200)):(t<3000?mix(143,100,ease(((float)t-1600)/1400)):100))));
  hannah->head.x=(t<400?mix(81,81,ease(((float)t-0)/400)):(t<1400?mix(81,84,ease(((float)t-400)/1000)):84));
  hannah->angle=(t<1600?mix(0.16f,0.16f,ease(((float)t-0)/1600)):(t<3000?mix(0.16f,0.06f,ease(((float)t-1600)/1400)):0.06f));
  break;
 case 4:
  *child=poses[0]; child->gaze=1;
  child->hand.x=(t<500?mix(93,93,ease(((float)t-0)/500)):(t<2200?mix(93,115,ease(((float)t-500)/1700)):115));
  child->hand.y=(t<500?mix(114,114,ease(((float)t-0)/500)):(t<2200?mix(114,147,ease(((float)t-500)/1700)):147));
  child->head.y=(t<2300?mix(81,81,ease(((float)t-0)/2300)):(t<3700?mix(81,82,ease(((float)t-2300)/1400)):82));
  child->angle=(t<2300?mix(-0.08f,-0.08f,ease(((float)t-0)/2300)):(t<3700?mix(-0.08f,0.09f,ease(((float)t-2300)/1400)):0.09f));
  child->brow=(t<2300?mix(0,0,ease(((float)t-0)/2300)):(t<3700?mix(0,1,ease(((float)t-2300)/1400)):1));
  *hannah=poses[1]; hannah->gaze=1;
  hannah->hand.x=(t<1200?mix(115,115,ease(((float)t-0)/1200)):(t<2500?mix(115,118,ease(((float)t-1200)/1300)):118));
  hannah->hand.y=(t<1200?mix(147,147,ease(((float)t-0)/1200)):(t<2500?mix(147,126,ease(((float)t-1200)/1300)):126));
  break;
 }
}
#define FRY_CONTACT 1400
#define FRY_BITE 3300
#define FRY_LENGTH 11
#define FRY_BITTEN_LENGTH 6
#define CUP_RELEASE 2200
static Pose reflection_pose(uint32_t t){Pose p=blend(poses[1],poses[0],(float)t/2400);p.hand=P(115,147);p.brow=0.4f*ease((float)t/3300);return p;}
