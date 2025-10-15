(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[185],{6102:function(e,r,t){Promise.resolve().then(t.t.bind(t,8877,23)),Promise.resolve().then(t.bind(t,3138))},3138:function(e,r,t){"use strict";t.d(r,{ToastProvider:function(){return m},p:function(){return u}});var n=t(7437),s=t(2265),i=t(8030);/**
 * @license lucide-react v0.456.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let o=(0,i.Z)("CircleCheckBig",[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]),a=(0,i.Z)("CircleX",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);var c=t(4697);let l=s.createContext(void 0),u=()=>{let e=s.useContext(l);if(!e)throw Error("useToast must be used within a ToastProvider");return e},d=e=>{let{id:r,type:t,message:i,onClose:l}=e;return(0,s.useEffect)(()=>{let e=setTimeout(()=>{l(r)},5e3);return()=>clearTimeout(e)},[r,l]),(0,n.jsxs)("div",{className:"\n      flex items-center p-4 mb-3 rounded-lg shadow-lg max-w-sm \n      transform transition-all duration-300 ease-in-out\n      ".concat("success"===t?"bg-green-50 border border-green-200 text-green-800":"bg-red-50 border border-red-200 text-red-800","\n    "),children:[(0,n.jsx)("div",{className:"flex-shrink-0 mr-3",children:"success"===t?(0,n.jsx)(o,{className:"h-5 w-5 text-green-400"}):(0,n.jsx)(a,{className:"h-5 w-5 text-red-400"})}),(0,n.jsx)("div",{className:"flex-1 text-sm font-medium",children:i}),(0,n.jsx)("button",{onClick:()=>l(r),className:"\n          ml-2 inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2\n          ".concat("success"===t?"text-green-500 hover:bg-green-100 focus:ring-green-600":"text-red-500 hover:bg-red-100 focus:ring-red-600","\n        "),children:(0,n.jsx)(c.Z,{className:"h-4 w-4"})})]})},m=e=>{let{children:r}=e,[t,i]=(0,s.useState)([]),o=e=>{i(r=>r.filter(r=>r.id!==e))};return(0,n.jsxs)(l.Provider,{value:{showToast:(e,r)=>{let t=Math.random().toString(36).substring(2,9);i(n=>[...n,{id:t,type:e,message:r}])}},children:[r,(0,n.jsx)("div",{className:"fixed top-4 right-4 z-50 space-y-2",children:t.map(e=>(0,n.jsx)(d,{id:e.id,type:e.type,message:e.message,onClose:o},e.id))})]})}},8030:function(e,r,t){"use strict";t.d(r,{Z:function(){return c}});var n=t(2265);/**
 * @license lucide-react v0.456.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),i=function(){for(var e=arguments.length,r=Array(e),t=0;t<e;t++)r[t]=arguments[t];return r.filter((e,r,t)=>!!e&&""!==e.trim()&&t.indexOf(e)===r).join(" ").trim()};/**
 * @license lucide-react v0.456.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var o={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.456.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,n.forwardRef)((e,r)=>{let{color:t="currentColor",size:s=24,strokeWidth:a=2,absoluteStrokeWidth:c,className:l="",children:u,iconNode:d,...m}=e;return(0,n.createElement)("svg",{ref:r,...o,width:s,height:s,stroke:t,strokeWidth:c?24*Number(a)/Number(s):a,className:i("lucide",l),...m},[...d.map(e=>{let[r,t]=e;return(0,n.createElement)(r,t)}),...Array.isArray(u)?u:[u]])}),c=(e,r)=>{let t=(0,n.forwardRef)((t,o)=>{let{className:c,...l}=t;return(0,n.createElement)(a,{ref:o,iconNode:r,className:i("lucide-".concat(s(e)),c),...l})});return t.displayName="".concat(e),t}},4697:function(e,r,t){"use strict";t.d(r,{Z:function(){return n}});/**
 * @license lucide-react v0.456.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,t(8030).Z)("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]])},8877:function(){}},function(e){e.O(0,[404,971,23,744],function(){return e(e.s=6102)}),_N_E=e.O()}]);