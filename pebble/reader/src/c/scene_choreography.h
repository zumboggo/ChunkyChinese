// Generated joint tracks; included after primitive math helpers.
#include <stddef.h>
typedef struct {uint16_t t;int16_t value;} ScalarKey;
static float scalar_track(uint32_t t,const ScalarKey *keys,int count){
 for(int i=1;i<count;i++)if(t<keys[i].t)return mix(keys[i-1].value,keys[i].value,ease((float)(t-keys[i-1].t)/(keys[i].t-keys[i-1].t)))/100;
 return keys[count-1].value/100.0f;
}
static const ScalarKey track_0[]={{0,6700},{1800,8100}};
static const ScalarKey track_1[]={{0,9700},{1800,11100}};
static const ScalarKey track_2[]={{0,13200},{1800,14600}};
static const ScalarKey track_3[]={{0,13300},{1800,14700}};
static const ScalarKey track_4[]={{0,10},{2400,0}};
static const ScalarKey track_5[]={{0,11500},{400,11500},{1400,13900},{1600,13900},{3000,9200}};
static const ScalarKey track_6[]={{0,14700},{400,14700},{1400,14300},{1600,14300},{3000,10000}};
static const ScalarKey track_7[]={{0,8100},{400,8100},{1400,8400}};
static const ScalarKey track_8[]={{0,16},{1600,16},{3000,6}};
static const ScalarKey track_9[]={{0,9300},{500,9300},{2200,11500}};
static const ScalarKey track_10[]={{0,11400},{500,11400},{2200,14700}};
static const ScalarKey track_11[]={{0,8100},{2300,8100},{3700,8200}};
static const ScalarKey track_12[]={{0,-8},{2300,-8},{3700,9}};
static const ScalarKey track_13[]={{0,0},{2300,0},{3700,100}};
static const ScalarKey track_14[]={{0,11500},{1200,11500},{2500,11800}};
static const ScalarKey track_15[]={{0,14700},{1200,14700},{2500,12600}};
static void direct_restaurant(uint32_t t,Pose *child,Pose *hannah){
 switch(scene_id){
 case 2:
  *child=poses[0]; child->gaze=1;
  child->head.y=scalar_track(t,track_0,2);
  child->shoulder.y=scalar_track(t,track_1,2);
  child->hip.y=scalar_track(t,track_2,2);
  child->hand.y=scalar_track(t,track_3,2);
  child->angle=scalar_track(t,track_4,2);
  *hannah=poses[1]; hannah->gaze=1;
  hannah->head.y+=sine(t*0.002f)*0.4f;
  break;
 case 3:
  *child=poses[0]; child->gaze=1;
  *hannah=poses[1]; hannah->gaze=1;
  hannah->hand.x=scalar_track(t,track_5,5);
  hannah->hand.y=scalar_track(t,track_6,5);
  hannah->head.x=scalar_track(t,track_7,3);
  hannah->angle=scalar_track(t,track_8,3);
  break;
 case 4:
  *child=poses[0]; child->gaze=1;
  child->hand.x=scalar_track(t,track_9,3);
  child->hand.y=scalar_track(t,track_10,3);
  child->head.y=scalar_track(t,track_11,3);
  child->angle=scalar_track(t,track_12,3);
  child->brow=scalar_track(t,track_13,3);
  *hannah=poses[1]; hannah->gaze=1;
  hannah->hand.x=scalar_track(t,track_14,3);
  hannah->hand.y=scalar_track(t,track_15,3);
  break;
 }
}
#define FRY_CONTACT 1400
#define FRY_BITE 3300
#define FRY_LENGTH 11
#define FRY_BITTEN_LENGTH 6
#define CUP_RELEASE 2200
static Pose reflection_pose(uint32_t t){Pose p=blend(poses[1],poses[0],(float)t/2400);p.hand=P(115,147);p.brow=0.4f*ease((float)t/3300);return p;}
