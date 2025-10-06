"use strict";(()=>{var e={};e.id=885,e.ids=[885],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4300:e=>{e.exports=require("buffer")},6113:e=>{e.exports=require("crypto")},2361:e=>{e.exports=require("events")},3685:e=>{e.exports=require("http")},5687:e=>{e.exports=require("https")},1808:e=>{e.exports=require("net")},5477:e=>{e.exports=require("punycode")},2781:e=>{e.exports=require("stream")},4404:e=>{e.exports=require("tls")},7310:e=>{e.exports=require("url")},9796:e=>{e.exports=require("zlib")},5415:(e,r,t)=>{t.r(r),t.d(r,{originalPathname:()=>g,patchFetch:()=>m,requestAsyncStorage:()=>c,routeModule:()=>p,serverHooks:()=>b,staticGenerationAsyncStorage:()=>d});var s={};t.r(s),t.d(s,{GET:()=>l});var a=t(9303),o=t(8716),n=t(670),i=t(7070),u=t(2632);async function l(e){try{let r=new URL(e.url).searchParams.get("consignment_id"),t=u.p.from("granite_blocks").select(`
        id,
        block_no,
        consignment_id,
        gross_measurement,
        net_measurement,
        status,
        granite_consignments!inner (
          id,
          consignment_number,
          supplier_id,
          granite_suppliers (
            id,
            name
          )
        )
      `).eq("status","RAW");r&&(t=t.eq("consignment_id",r));let{data:s,error:a}=await t.order("block_no",{ascending:!0});if(a)return console.error("Database error fetching available blocks:",a),i.NextResponse.json({error:a.message},{status:500});return i.NextResponse.json(s)}catch(e){return console.error("Server error fetching available blocks:",e),i.NextResponse.json({error:"Internal server error"},{status:500})}}let p=new a.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/available-blocks/route",pathname:"/api/available-blocks",filename:"route",bundlePath:"app/api/available-blocks/route"},resolvedPagePath:"/Users/bala/Downloads/granite-ledger-1/app/api/available-blocks/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:c,staticGenerationAsyncStorage:d,serverHooks:b}=p,g="/api/available-blocks/route";function m(){return(0,n.patchFetch)({serverHooks:b,staticGenerationAsyncStorage:d})}},2632:(e,r,t)=>{let s;t.d(r,{p:()=>s});var a=t(2814);let o=process.env.SUPABASE_URL,n=process.env.SUPABASE_SERVICE_ROLE;o&&n?s=(0,a.eI)(o,n,{auth:{persistSession:!1}}):(console.warn("Missing Supabase environment variables. Using dummy client."),s={from:()=>({select:()=>({data:[],error:Error("Supabase not configured")}),insert:()=>({data:null,error:Error("Supabase not configured")}),update:()=>({data:null,error:Error("Supabase not configured")}),delete:()=>({data:null,error:Error("Supabase not configured")})})})}};var r=require("../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),s=r.X(0,[948,505],()=>t(5415));module.exports=s})();