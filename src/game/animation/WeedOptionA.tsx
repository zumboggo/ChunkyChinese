/** David's approved Option A: native SVG, driven by the shared acting rig. */
type FaceProps={id:string;emotion:string;blink:boolean;mouth:number;startled:boolean;laughing:boolean;firm:boolean;worried:boolean;turn:number;gazeX:number;gazeY:number;reduced:boolean};
const ink='#202c32',skin='#dcaf8e',shadow='#b97f68';
export function WeedOptionAFace({id,emotion,blink,mouth,startled,laughing,firm,worried,turn,gazeX,gazeY,reduced}:FaceProps){
 const warm=['happy','relieved'].includes(emotion),eager=['excited','proud'].includes(emotion),grin=warm||eager||laughing;
 const outline='M108 91 Q148 62 187 91 L184 130 Q179 151 164 166 Q151 177 139 168 L119 151 L110 132 Z';
 const eye=(x:number)=>startled?`M${x-11} 123 Q${x} 105 ${x+10} 122 Q${x} 142 ${x-11} 123Z`:firm?`M${x-11} 123 Q${x} 120 ${x+10} 122 Q${x} 131 ${x-11} 123Z`:`M${x-11} 123 Q${x} ${warm?114:115} ${x+10} 122 Q${x} ${warm?127:131} ${x-11} 123Z`;
 const transition=reduced?'none':'transform 240ms ease-out';
 return <g data-weed-option="A" data-refined-face="scrappy" data-expression={warm?'family-warmth':eager?'reward':emotion} strokeLinejoin="round" strokeLinecap="round" transform="translate(-29 -2)">
  <defs><clipPath id={`${id}-weed-face`}><path d={outline}/></clipPath>{[130,167].map(x=><clipPath key={x} id={`${id}-weed-eye-${x}`}><path d={eye(x)}/></clipPath>)}</defs>
  <path d="M108 112 Q96 105 100 122 Q101 135 113 136 M185 113 Q199 106 193 125 Q190 135 182 136" fill={skin} stroke={ink} strokeWidth="1.7"/>
  <path d={outline} fill={skin} stroke={ink} strokeWidth="2"/>
  <g clipPath={`url(#${id}-weed-face)`}>
   <path d="M107 96 L122 115 L117 137 L138 162 L151 173 L134 174 L111 146Z" fill={shadow} opacity=".45"/>
   <path d="M183 99 L175 122 L179 137 L159 164 L153 172 L171 165 L187 142Z" fill={shadow} opacity=".58"/>
   <path d="M138 110 L147 103 L150 131 L144 139 L141 133Z" fill="#f7d3ac" opacity=".6"/>
   <path d="M152 125 L148 141 L158 139Z" fill={shadow} opacity=".65"/>
   <path d="M112 103 L126 116 L143 111 L151 118 L175 104 L185 98 L183 85 L110 84Z" fill={shadow} opacity=".23"/>
   {(warm||emotion==='embarrassed')&&<g fill="#c57968" opacity={warm?.13:.3}><ellipse cx="126" cy="137" rx="10" ry="4"/><ellipse cx="173" cy="137" rx="10" ry="4"/></g>}
  </g>
  <g style={{transform:`translateX(${turn*6}px)`,transition}}>
   <path d={startled?'M118 110 Q130 100 140 107 M157 107 Q169 100 179 110':firm?'M118 110 L140 115 M157 115 L179 109':worried?'M118 114 Q130 114 140 106 M157 106 Q169 114 179 114':eager?'M118 108 Q130 100 140 107 M157 110 Q169 101 179 107':'M118 111 Q130 104 140 110 M157 112 Q169 106 178 109'} fill="none" stroke={ink} strokeWidth="3"/>
   {[130,167].map(x=><g key={x} data-feature="eye">
    {blink||laughing?<path d={`M${x-10} 123 Q${x} ${grin?114:129} ${x+10} 122`} fill="none" stroke={ink} strokeWidth="2.5"/>:<>
     <path d={eye(x)} fill="#fff6e5" stroke={ink} strokeWidth="1.3"/>
     <g clipPath={`url(#${id}-weed-eye-${x})`}><g data-gaze-pupil="true" style={{transform:`translate(${gazeX}px,${gazeY}px)`,transition}}><ellipse cx={x+2} cy="123" rx="4.5" ry="6.4" fill="#946b37"/><ellipse cx={x+2} cy="123" rx="2.6" ry="5.5" fill={ink}/><circle cx={x+.5} cy="120" r="1.35" fill="#fff9e9"/></g></g>
     <path d={`M${x-11} 123 Q${x} ${firm?120:warm?114:115} ${x+10} 122`} fill="none" stroke={ink} strokeWidth="2.5"/>
    </>}
    <path d={`M${x-7} 133 Q${x} 135 ${x+6} 132`} fill="none" stroke={shadow} strokeWidth=".8"/>
   </g>)}
   <path d="M147 139 L144 142 L151 143 L155 140" fill="none" stroke={shadow} strokeWidth="1.3"/>
   <g data-mouth={mouth} data-smile={grin?'broad':'none'} stroke={ink} strokeWidth="1.2">
    {startled&&!mouth?<ellipse cx="150" cy="153" rx="6" ry="8" fill="#784a43"/>:laughing||grin||(!firm&&!worried)?<>
     <path d={laughing||mouth?'M133 147 Q150 157 168 145 Q166 169 151 168 Q137 166 133 147Z':warm?'M133 147 Q150 157 168 145 Q162 165 149 163 Q139 162 133 147Z':'M137 150 Q150 155 165 145 Q161 158 151 159 Q142 158 137 150Z'} fill="#784a43"/>
     <path d="M137 150 Q151 155 165 146 L162 152 Q149 159 139 153Z" fill="#fff6de" stroke="none"/>
    </>:mouth?<path d={mouth===1?'M140 149 Q150 145 160 149 Q158 160 149 159 Q142 158 140 149Z':'M145 147 Q155 145 156 153 Q154 160 146 156Z'} fill="#784a43"/>:<path d={firm?'M137 151 Q149 148 160 150':'M137 154 Q149 147 161 153'} fill="none" strokeWidth="1.8"/>}
   </g>
   <path d="M145 163 Q151 165 158 161" fill="none" stroke="#f8d2b0" strokeWidth="1.5"/>
   <path d="M176 137 l5 -2 m-5 5 l5 -2" stroke="#a86959" strokeWidth="1"/>
  </g>
  <g data-feature="hair"><path d="M109 125 L99 108 L103 100 L96 94 L106 78 L101 75 L119 65 L116 57 L135 62 L148 48 L151 59 L175 54 L172 64 L191 68 L185 75 L201 89 L192 96 L198 111 L187 129 L182 105 L176 88 Q171 108 157 115 L163 89 Q151 110 139 116 L145 91 Q129 112 121 117 L124 94 L114 119Z" fill="#282b2a" stroke={ink} strokeWidth="2"/>
   <path d="M109 91 Q123 73 140 68 M127 94 Q144 73 164 67 M157 89 Q168 73 181 78 M180 87 L188 105" fill="none" stroke="#626366" strokeWidth="1.15" opacity=".65"/>
   <path d="M122 80 L114 99 M154 73 Q144 94 136 103 M177 82 L172 99" fill="none" stroke="#111e27" strokeWidth="1.1"/>
  </g>
 </g>
}
export function WeedOptionAShirt(){return <g data-costume="workshirt" data-weed-costume="A" stroke={ink} strokeWidth="2" strokeLinejoin="round">
 <path d="M105 187 Q85 188 73 204 L82 253 L88 345 Q120 355 152 345 L158 253 L167 204 Q154 188 135 187 L120 198Z" fill="#526d6c"/>
 <path d="M95 194 L83 217 L93 253 L96 341 L108 347 L103 252 L106 208Z M141 199 L157 219 L148 261 L150 344 L139 348 L139 263Z" fill="#334e53" stroke="none"/>
 <path d="M79 209 L94 197 L101 219 L95 234 L81 234Z M139 198 L153 195 L163 212 L158 232 L148 227Z" fill="#718b86" stroke="none" opacity=".55"/>
 <path d="M105 187 L120 198 L110 220 L97 193Z M135 187 L120 198 L130 218 L143 193Z" fill="#718b86"/>
 <path d="M113 211 L120 227 L130 211 L120 199Z" fill="#283f47"/>
 <path d="M120 227 V345" stroke="#334e53"/>
 <path d="M132 240 L149 238 L148 262 L140 268 L132 262Z" fill="#334e53"/><path d="M134 243 L147 241" stroke="#718b86" strokeWidth="1"/>
 <path d="M96 295 L107 301 M138 293 L149 289 M98 326 L112 330 M126 335 L139 329" fill="none" stroke="#334e53" strokeWidth="1.4"/>
 <path d="M88 344 Q120 351 152 344 L153 355 Q120 361 87 355Z" fill="#6a4b38"/><rect x="113" y="347" width="14" height="12" rx="2" fill="#bca273"/>
 </g>}
