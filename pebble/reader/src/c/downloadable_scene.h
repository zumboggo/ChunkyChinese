// Schema 1 compact CSV: version,actor,setting,ambient,prop,count,[ms,dy,hx,hy,angle_milliradians]...
// Bounded parser: no allocation, scripts, arbitrary assets or pointers.
#define DOWNLOADED_SCENE 65535
#define DOWNLOAD_KEYS 8
typedef struct {uint8_t actor,setting,ambient,prop,count;GestureKey keys[DOWNLOAD_KEYS];} DownloadScene;
static bool decode_values(const int16_t *v,int n,DownloadScene *out){
 if(n<6||v[0]!=1||v[1]<0||v[1]>5||v[2]<0||v[2]>6||v[3]<0||v[3]>6||v[4]<0||v[4]>1||v[5]<2||v[5]>8||n!=6+v[5]*5)return false;
 int s=v[2],a=v[3];
 if((s==0&&a!=0&&a!=6)||(s!=0&&a==0)||(s==5&&a!=3&&a!=6)||(s!=5&&a==3)||(s==6&&a!=6))return false;
 out->actor=v[1];out->setting=s;out->ambient=a;out->prop=v[4];out->count=v[5];
 int px=0,py=0;
 for(int i=0;i<out->count;i++){
  const int16_t *k=&v[6+i*5];
  if(k[0]<0||k[0]>12000||(i==0?k[0]!=0:k[0]<=v[6+(i-1)*5])||k[1]<-8||k[1]>8||k[2]<-30||k[2]>24||k[3]<-42||k[3]>8||k[4]<-300||k[4]>300)return false;
  int x=(25+k[2])*10,y=(29+k[3])*10-k[1]*3;
  if(x*x+y*y>313600)return false;
  if(i){int dx=x-px,dy=y-py,d=dx*dx+dy*dy,dot=-(px*dx+py*dy);
   if(!d||dot<=0){if(px*px+py*py<6400)return false;}
   else if(dot>=d){if(x*x+y*y<6400)return false;}
   else{int64_t cross=(int64_t)px*dy-(int64_t)py*dx;if(cross*cross<(int64_t)6400*d)return false;}
  }
  px=x;py=y;out->keys[i]=(GestureKey){k[0],k[1],k[2],k[3],k[4]};
 }
 return out->keys[out->count-1].t>=800;
}

#ifdef DOWNLOAD_TEXT_TEST
static bool scene_number(const char **p,int16_t *out){
 bool negative=false;if(**p=='-'){negative=true;(*p)++;}
 if(**p<'0'||**p>'9')return false;
 int n=0;
 do{n=n*10+(*(*p)++-'0');if(n>12000)return false;}while(**p>='0'&&**p<='9');
 *out=negative?-n:n;return true;
}
static bool decode_scene(const char *p,DownloadScene *out){
 if(!p)return false;
 for(int i=0;p[i];i++)if(i>=512)return false;
 int16_t v[46];int n=0;
 do{if(n>=46||!scene_number(&p,&v[n++]))return false;if(!*p)break;if(*p++!=',')return false;}while(true);
 return decode_values(v,n,out);
}
#endif
