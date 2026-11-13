// Generated from library.json and ensemble/characters.json.
#define AMBIENT_PERIOD 12000
#define AMBIENT_FRAME_MS 167
#define TRAIN_TILE 180
#define TRAIN_FAR_CYCLES 1
#define TRAIN_NEAR_CYCLES 3
typedef struct {uint16_t t;float dy,hx,hy,angle;} GestureKey;
static const GestureKey gestures[][5]={{{0,0,0,0,0},{1200,3,0,0,0.1f},{2400,4,0,0,0.1f},{3600,1,0,0,0.02f},{4800,1,0,0,0.02f}},{{0,0,0,0,0},{1000,3,0,0,0.05f},{2600,5,22,-13,0.08f},{4000,5,22,-13,0.08f},{4800,5,22,-13,0.08f}},{{0,0,0,0,0},{1500,-2,-23,-42,-0.1f},{3200,-2,-23,-42,-0.1f},{4800,0,0,0,0},{4800,0,0,0,0}},{{0,0,0,0,0},{1800,2,-15,-39,0.03f},{2900,2,-15,-39,0.03f},{4800,0,0,0,0},{4800,0,0,0,0}}};
static const uint8_t gesture_counts[]={5,5,4,4};
static const uint32_t ensemble_skin[]={0xaaaaaa,0xffaa55,0xffaa55};
static const uint32_t ensemble_shirt[]={0x555555,0x555555,0xffffff};
static const uint32_t ensemble_hair[]={0x555555,0x553300,0x553300};
// Arrays indexed by stable native scene ID; actor -1 uses existing Alden rig.
static const int8_t scene_actor[]={-1,-1,-1,-1,-1,-1,0,0,0,0,1,1,1,1,2,2,2,2,-1,-1,-1,-1,-1,-1,-1,-1,2,1,2,2,1};
static const uint8_t scene_gesture[]={0,0,0,0,0,0,0,1,2,3,0,1,2,3,0,1,2,3,0,0,0,0,0,0,0,0,0,2,2,0,2};
static const uint8_t scene_setting[]={0,0,1,1,1,0,2,2,2,2,1,1,1,1,1,1,1,1,0,1,2,3,4,5,3,3,0,0,0,6,6};
static const uint8_t scene_ambient[]={0,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,2,2,3,4,5,0,0,0,2,2};
