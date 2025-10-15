"use strict";(()=>{var e={};e.id=646,e.ids=[646],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4300:e=>{e.exports=require("buffer")},6113:e=>{e.exports=require("crypto")},2361:e=>{e.exports=require("events")},3685:e=>{e.exports=require("http")},5687:e=>{e.exports=require("https")},1808:e=>{e.exports=require("net")},5477:e=>{e.exports=require("punycode")},2781:e=>{e.exports=require("stream")},4404:e=>{e.exports=require("tls")},7310:e=>{e.exports=require("url")},9796:e=>{e.exports=require("zlib")},9697:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>h,patchFetch:()=>f,requestAsyncStorage:()=>d,routeModule:()=>_,serverHooks:()=>c,staticGenerationAsyncStorage:()=>p});var s={};r.r(s),r.d(s,{GET:()=>l});var a=r(9303),o=r(8716),i=r(670),n=r(7070),u=r(2632);async function l(e){let t=new URL(e.url),r=t.searchParams.get("from"),s=t.searchParams.get("to"),a=t.searchParams.get("month"),o=t.searchParams.get("year");try{let e="",t=[];if(a&&o){let r=`${o}-${a.padStart(2,"0")}-01`,s=new Date(parseInt(o),parseInt(a),0).toISOString().split("T")[0];e="date >= $1 AND date <= $2",t.push(r,s)}else r&&s?(e="date >= $1 AND date <= $2",t.push(r,s)):r?(e="date >= $1",t.push(r)):s&&(e="date <= $1",t.push(s));let i=`
      SELECT 
        COUNT(*) as total_entries,
        COUNT(DISTINCT date) as total_days,
        SUM(no_of_workers) as total_workers,
        SUM(number_of_slabs) as total_slabs,
        SUM(total_sqft) as total_sqft,
        SUM(no_of_hours) as total_hours,
        SUM(debit_amount) as total_debit,
        SUM(credit_amount) as total_credit,
        (SUM(debit_amount) - SUM(credit_amount)) as balance,
        AVG(rate_per_hour) as avg_rate_per_hour
      FROM line_polish_reports
      ${e?`WHERE ${e}`:""}
    `,{data:l,error:_}=await u.p.rpc("execute_sql",{query:i,params:t}),d=`
      SELECT 
        shift,
        activity,
        COUNT(*) as entries,
        SUM(no_of_workers) as workers,
        SUM(number_of_slabs) as slabs,
        SUM(total_sqft) as sqft,
        SUM(no_of_hours) as hours,
        SUM(debit_amount) as debit,
        SUM(credit_amount) as credit,
        AVG(rate_per_hour) as avg_rate
      FROM line_polish_reports
      ${e?`WHERE ${e}`:""}
      GROUP BY shift, activity
      ORDER BY shift, activity
    `,{data:p,error:c}=await u.p.rpc("execute_sql",{query:d,params:t}),h=`
      SELECT 
        date,
        SUM(no_of_workers) as workers,
        SUM(number_of_slabs) as slabs,
        SUM(total_sqft) as sqft,
        SUM(no_of_hours) as hours,
        SUM(debit_amount) as debit,
        SUM(credit_amount) as credit
      FROM line_polish_reports
      ${e?`WHERE ${e}`:"WHERE date >= CURRENT_DATE - INTERVAL '30 days'"}
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `,{data:f,error:b}=await u.p.rpc("execute_sql",{query:h,params:e?t:[]});if(_||c||b){let r=u.p.from("line_polish_reports").select("*");e&&t.length>0&&(r=2===t.length?r.gte("date",t[0]).lte("date",t[1]):r.gte("date",t[0]));let{data:s,error:a}=await r;if(a)return n.NextResponse.json({error:a.message},{status:500});let o={summary:{total_entries:s.length,total_days:new Set(s.map(e=>e.date)).size,total_workers:s.reduce((e,t)=>e+(t.no_of_workers||0),0),total_slabs:s.reduce((e,t)=>e+(t.number_of_slabs||0),0),total_sqft:s.reduce((e,t)=>e+(t.total_sqft||0),0),total_hours:s.reduce((e,t)=>e+(t.no_of_hours||0),0),total_debit:s.reduce((e,t)=>e+(t.debit_amount||0),0),total_credit:s.reduce((e,t)=>e+(t.credit_amount||0),0),balance:s.reduce((e,t)=>e+(t.debit_amount||0)-(t.credit_amount||0),0),avg_rate_per_hour:s.length>0?s.reduce((e,t)=>e+(t.rate_per_hour||0),0)/s.length:0},shift_breakdown:{},daily_trends:[]},i=s.reduce((e,t)=>{let r=`${t.shift}_${t.activity}`;return e[r]||(e[r]={shift:t.shift,activity:t.activity,entries:0,workers:0,slabs:0,sqft:0,hours:0,debit:0,credit:0,rates:[]}),e[r].entries++,e[r].workers+=t.no_of_workers||0,e[r].slabs+=t.number_of_slabs||0,e[r].sqft+=t.total_sqft||0,e[r].hours+=t.no_of_hours||0,e[r].debit+=t.debit_amount||0,e[r].credit+=t.credit_amount||0,e[r].rates.push(t.rate_per_hour||0),e},{});o.shift_breakdown=Object.values(i).map(e=>({...e,avg_rate:e.rates.length>0?e.rates.reduce((e,t)=>e+t,0)/e.rates.length:0}));let l=s.reduce((e,t)=>{let r=t.date;return e[r]||(e[r]={date:r,workers:0,slabs:0,sqft:0,hours:0,debit:0,credit:0}),e[r].workers+=t.no_of_workers||0,e[r].slabs+=t.number_of_slabs||0,e[r].sqft+=t.total_sqft||0,e[r].hours+=t.no_of_hours||0,e[r].debit+=t.debit_amount||0,e[r].credit+=t.credit_amount||0,e},{});return o.daily_trends=Object.values(l).sort((e,t)=>new Date(t.date).getTime()-new Date(e.date).getTime()).slice(0,30),n.NextResponse.json(o)}return n.NextResponse.json({summary:l?.[0]||{},shift_breakdown:p||[],daily_trends:f||[]})}catch(e){return console.error("Error fetching line polish analytics:",e),n.NextResponse.json({error:"Internal server error"},{status:500})}}let _=new a.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/line-polish-reports/analytics/route",pathname:"/api/line-polish-reports/analytics",filename:"route",bundlePath:"app/api/line-polish-reports/analytics/route"},resolvedPagePath:"/Users/bala/Downloads/granite-ledger-1/app/api/line-polish-reports/analytics/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:d,staticGenerationAsyncStorage:p,serverHooks:c}=_,h="/api/line-polish-reports/analytics/route";function f(){return(0,i.patchFetch)({serverHooks:c,staticGenerationAsyncStorage:p})}},2632:(e,t,r)=>{let s;r.d(t,{p:()=>s});var a=r(2814);let o=process.env.SUPABASE_URL,i=process.env.SUPABASE_SERVICE_ROLE;o&&i?s=(0,a.eI)(o,i,{auth:{persistSession:!1}}):(console.warn("Missing Supabase environment variables. Using dummy client."),s={from:()=>({select:()=>({data:[],error:Error("Supabase not configured")}),insert:()=>({data:null,error:Error("Supabase not configured")}),update:()=>({data:null,error:Error("Supabase not configured")}),delete:()=>({data:null,error:Error("Supabase not configured")})})})}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[948,505],()=>r(9697));module.exports=s})();