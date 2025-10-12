(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[185],{6102:function(e,t,r){Promise.resolve().then(r.t.bind(r,8877,23)),Promise.resolve().then(r.bind(r,151))},151:function(e,t,r){"use strict";r.d(t,{ToastProvider:function(){return d},p:function(){return u}});var n=r(7437),s=r(2265),i=r(2940),o=r(1935),c=r(4697);let a=s.createContext(void 0),u=()=>{let e=s.useContext(a);if(!e)throw Error("useToast must be used within a ToastProvider");return e},l=e=>{let{id:t,type:r,message:a,onClose:u}=e;return(0,s.useEffect)(()=>{let e=setTimeout(()=>{u(t)},5e3);return()=>clearTimeout(e)},[t,u]),(0,n.jsxs)("div",{className:"\n      flex items-center p-4 mb-3 rounded-lg shadow-lg max-w-sm \n      transform transition-all duration-300 ease-in-out\n      ".concat("success"===r?"bg-green-50 border border-green-200 text-green-800":"bg-red-50 border border-red-200 text-red-800","\n    "),children:[(0,n.jsx)("div",{className:"flex-shrink-0 mr-3",children:"success"===r?(0,n.jsx)(i.Z,{className:"h-5 w-5 text-green-400"}):(0,n.jsx)(o.Z,{className:"h-5 w-5 text-red-400"})}),(0,n.jsx)("div",{className:"flex-1 text-sm font-medium",children:a}),(0,n.jsx)("button",{onClick:()=>u(t),className:"\n          ml-2 inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2\n          ".concat("success"===r?"text-green-500 hover:bg-green-100 focus:ring-green-600":"text-red-500 hover:bg-red-100 focus:ring-red-600","\n        "),children:(0,n.jsx)(c.Z,{className:"h-4 w-4"})})]})},d=e=>{let{children:t}=e,[r,i]=(0,s.useState)([]),o=e=>{i(t=>t.filter(t=>t.id!==e))};return(0,n.jsxs)(a.Provider,{value:{showToast:(e,t)=>{let r=Math.random().toString(36).substring(2,9);i(n=>[...n,{id:r,type:e,message:t}])}},children:[t,(0,n.jsx)("div",{className:"fixed top-4 right-4 z-50 space-y-2",children:r.map(e=>(0,n.jsx)(l,{id:e.id,type:e.type,message:e.message,onClose:o},e.id))})]})}},8030:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});var n=r(2265);/**
 * @license lucide-react v0.456.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),i=function(){for(var e=arguments.length,t=Array(e),r=0;r<e;r++)t[r]=arguments[r];return t.filter((e,t,r)=>!!e&&""!==e.trim()&&r.indexOf(e)===t).join(" ").trim()};/**
 * @license lucide-react v0.456.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var o={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.456.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let c=(0,n.forwardRef)((e,t)=>{let{color:r="currentColor",size:s=24,strokeWidth:c=2,absoluteStrokeWidth:a,className:u="",children:l,iconNode:d,...f}=e;return(0,n.createElement)("svg",{ref:t,...o,width:s,height:s,stroke:r,strokeWidth:a?24*Number(c)/Number(s):c,className:i("lucide",u),...f},[...d.map(e=>{let[t,r]=e;return(0,n.createElement)(t,r)}),...Array.isArray(l)?l:[l]])}),a=(e,t)=>{let r=(0,n.forwardRef)((r,o)=>{let{className:a,...u}=r;return(0,n.createElement)(c,{ref:o,iconNode:t,className:i("lucide-".concat(s(e)),a),...u})});return r.displayName="".concat(e),r}},2940:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.456.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(8030).Z)("CircleCheckBig",[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]])},1935:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.456.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(8030).Z)("CircleX",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]])},4697:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.456.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(8030).Z)("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]])},8877:function(){}},function(e){e.O(0,[404,971,23,744],function(){return e(e.s=6102)}),_N_E=e.O()}]);