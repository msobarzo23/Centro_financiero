import { useState, useEffect } from 'react';
import { fetchAllData, getToday } from './data.js';

const T = {
  dark: {
    bg:"#0C1117",surface:"#131A23",surfaceAlt:"#1A2332",border:"#1E2D3D",borderL:"#2A3A4D",
    text:"#E8ECF1",tm:"#8899AA",td:"#5C6F82",
    accent:"#4FC3F7",accentD:"rgba(79,195,247,0.12)",
    green:"#66BB6A",greenD:"rgba(102,187,106,0.12)",greenT:"#81C784",
    red:"#EF5350",redD:"rgba(239,83,80,0.12)",
    amber:"#FFB74D",amberD:"rgba(255,183,77,0.12)",amberT:"#FFCC80",
    purple:"#AB47BC",purpleD:"rgba(171,71,188,0.12)",
    cyan:"#26C6DA",cyanD:"rgba(38,198,218,0.12)",
    teal:"#26A69A",tealD:"rgba(38,166,154,0.12)",
  },
  light: {
    bg:"#F5F6F8",surface:"#FFFFFF",surfaceAlt:"#F0F1F4",border:"#E0E2E8",borderL:"#D0D3DA",
    text:"#1A1D23",tm:"#5A6370",td:"#8C95A3",
    accent:"#0277BD",accentD:"rgba(2,119,189,0.08)",
    green:"#2E7D32",greenD:"rgba(46,125,50,0.08)",greenT:"#2E7D32",
    red:"#C62828",redD:"rgba(198,40,40,0.08)",
    amber:"#E65100",amberD:"rgba(230,81,0,0.08)",amberT:"#E65100",
    purple:"#7B1FA2",purpleD:"rgba(123,31,162,0.08)",
    cyan:"#00838F",cyanD:"rgba(0,131,143,0.08)",
    teal:"#00695C",tealD:"rgba(0,105,92,0.08)",
  },
};

const f=(n)=>{if(n==null)return"—";const a=Math.abs(n);if(a>=1e9)return`$${(n/1e9).toLocaleString("es-CL",{minimumFractionDigits:1,maximumFractionDigits:1})} MM`;if(a>=1e6)return`$${Math.round(n/1e6).toLocaleString("es-CL")} M`;return`$${Math.round(n).toLocaleString("es-CL")}`;};
const fS=(n)=>{if(n==null)return"—";const a=Math.abs(n);if(a>=1e9)return`${(n/1e9).toFixed(1)}MM`;if(a>=1e6)return`${Math.round(n/1e6)}M`;return Math.round(n).toLocaleString("es-CL");};
const dd=(a,b)=>Math.ceil((new Date(b)-new Date(a))/864e5);
const fd=(d)=>d?new Date(d+"T12:00:00").toLocaleDateString("es-CL",{day:"2-digit",month:"2-digit"}):"";
const fdf=(d)=>d?new Date(d+"T12:00:00").toLocaleDateString("es-CL",{weekday:"short",day:"2-digit",month:"short"}):"";
const fUF=(n)=>n?n.toLocaleString("es-CL",{minimumFractionDigits:2,maximumFractionDigits:2}):"—";
const mesLabel=(m)=>new Date(m+"-15").toLocaleDateString("es-CL",{month:"short"});
const mesLabelLargo=(m)=>new Date(m+"-15").toLocaleDateString("es-CL",{month:"long",year:"numeric"});

const TABS=["Resumen","Bancos","Calendario","Flujo de Caja","Inversiones","Fondos Mutuos","Leasing","Crédito","Alertas","Calculadora"];

function Metric({label,value,sub,color,C}){
  return(<div style={{background:C.surface,borderRadius:10,padding:"14px 16px",border:`0.5px solid ${C.border}`,flex:1,minWidth:130}}>
    <div style={{fontSize:11,color:C.tm,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</div>
    <div style={{fontSize:22,fontWeight:600,color:color||C.accent,lineHeight:1.2}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:C.td,marginTop:3}}>{sub}</div>}
  </div>);
}

function Loading({C}){
  return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"60px 20px",flexDirection:"column",gap:12}}>
    <div style={{width:40,height:40,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`,borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
    <div style={{fontSize:13,color:C.tm}}>Cargando datos desde Google Sheets...</div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>);
}

function clas(tipo){
  const t=(tipo||'').trim().toLowerCase();
  if(t==='trabajo')return'trabajo';
  if(t==='inversion'||t==='inversión')return'inversion';
  if(t==='credito'||t==='crédito')return'credito';
  return t;
}

function colorTipo(t,C){
  if(t==='trabajo')return{bg:C.accentD,color:C.accent};
  if(t==='inversion')return{bg:C.amberD,color:C.amber};
  if(t==='credito')return{bg:C.cyanD,color:C.cyan};
  return{bg:C.purpleD,color:C.purple};
}

function colorBanco(banco,C){
  const b=(banco||'').toUpperCase();
  if(b.includes('BCI'))   return{bg:C.accentD,color:C.accent};
  if(b.includes('VOLVO')||b.includes('VFS')) return{bg:C.amberD,color:C.amber};
  if(b.includes('CHILE')) return{bg:C.tealD,color:C.teal};
  return{bg:C.purpleD,color:C.purple};
}

// ─── MOTOR DE ALERTAS ────────────────────────────────────────────────────────
function buildAlertas({dap,cal,leasingDetalle,creditoPendiente},hoy){
  const alertas=[];
  const diasHasta=(fecha)=>Math.ceil((new Date(fecha+"T12:00:00")-new Date(hoy+"T12:00:00"))/864e5);

  const dapsV=dap.filter(d=>(d.vigente==="si"||d.vigente==="sí")&&d.vencimiento);
  dapsV.forEach(d=>{
    const dias=diasHasta(d.vencimiento);
    if(dias>=0&&dias<=7){
      const monto=d.montoInicial>=1e9?`$${(d.montoInicial/1e9).toFixed(1)}MM`:d.montoInicial>=1e6?`$${Math.round(d.montoInicial/1e6)}M`:`$${Math.round(d.montoInicial).toLocaleString("es-CL")}`;
      const label=d.comentario||`DAP ${d.banco}`;
      const tipo=dias<=2?"urgente":dias<=5?"atencion":"info";
      alertas.push({tipo,icono:"💰",titulo:`DAP vence ${dias===0?"hoy":dias===1?"mañana":`en ${dias}d`}`,mensaje:`${label} · ${monto} · ${d.banco}`,fecha:d.vencimiento,dias});
    }
  });

  const gruposLeasing={};
  leasingDetalle.forEach(d=>{
    const k=d.diaVto;
    if(!gruposLeasing[k])gruposLeasing[k]={diaVto:k,cuotaCIVA:0,bancos:new Set()};
    gruposLeasing[k].cuotaCIVA+=d.cuotaCLPcIVA;
    gruposLeasing[k].bancos.add(d.banco);
  });
  Object.values(gruposLeasing).forEach(g=>{
    const hoyD=new Date(hoy+"T12:00:00");
    let fechaVto=new Date(hoyD.getFullYear(),hoyD.getMonth(),g.diaVto,12,0,0);
    if(fechaVto<hoyD) fechaVto=new Date(hoyD.getFullYear(),hoyD.getMonth()+1,g.diaVto,12,0,0);
    const yyyy=fechaVto.getFullYear();
    const mm=String(fechaVto.getMonth()+1).padStart(2,"0");
    const dd2=String(fechaVto.getDate()).padStart(2,"0");
    const fechaStr=`${yyyy}-${mm}-${dd2}`;
    const dias=diasHasta(fechaStr);
    if(dias>=0&&dias<=7){
      const monto=g.cuotaCIVA>=1e6?`$${Math.round(g.cuotaCIVA/1e6)}M`:`$${Math.round(g.cuotaCIVA).toLocaleString("es-CL")}`;
      const bancos=[...g.bancos].join(", ");
      const tipo=dias<=2?"urgente":dias<=5?"atencion":"info";
      alertas.push({tipo,icono:"🚛",titulo:`Cuota leasing día ${g.diaVto} · ${dias===0?"hoy":dias===1?"mañana":`en ${dias}d`}`,mensaje:`${monto} c/IVA · ${bancos}`,fecha:fechaStr,dias});
    }
  });

  const proxCred=creditoPendiente.find(c=>c.valorCuota>0);
  if(proxCred){
    const dias=diasHasta(proxCred.fechaVenc);
    if(dias>=0&&dias<=7){
      const monto=proxCred.valorCuota>=1e6?`$${Math.round(proxCred.valorCuota/1e6)}M`:`$${Math.round(proxCred.valorCuota).toLocaleString("es-CL")}`;
      const tipo=dias<=2?"urgente":dias<=5?"atencion":"info";
      alertas.push({tipo,icono:"🏦",titulo:`Cuota crédito N°${proxCred.nCuota} · ${dias===0?"hoy":dias===1?"mañana":`en ${dias}d`}`,mensaje:`${monto} · Capital: $${Math.round(proxCred.amortizacion/1e6)}M · Interés: $${Math.round(proxCred.interes/1e6)}M`,fecha:proxCred.fechaVenc,dias});
    }
  }

  const finVentana=new Date(hoy+"T12:00:00");
  finVentana.setDate(finVentana.getDate()+7);
  const finVentanaStr=`${finVentana.getFullYear()}-${String(finVentana.getMonth()+1).padStart(2,"0")}-${String(finVentana.getDate()).padStart(2,"0")}`;
  cal.filter(c=>c.fecha>=hoy&&c.fecha<=finVentanaStr&&c.falta>0).forEach(c=>{
    const dias=diasHasta(c.fecha);
    const faltaStr=c.falta>=1e6?`$${Math.round(c.falta/1e6)}M`:`$${Math.round(c.falta).toLocaleString("es-CL")}`;
    const tipo=dias<=2?"urgente":"atencion";
    alertas.push({tipo,icono:"📅",titulo:`Compromiso sin fondos · ${dias===0?"hoy":dias===1?"mañana":`en ${dias}d`}`,mensaje:`${c.concepto} · Falta ${faltaStr}`,fecha:c.fecha,dias});
  });

  const orden={urgente:0,atencion:1,info:2};
  alertas.sort((a,b)=>orden[a.tipo]-orden[b.tipo]||a.dias-b.dias);
  return alertas;
}

// ─── GRÁFICO BARRAS COBERTURA CALENDARIO ─────────────────────────────────────
function GraficoCobertura({C, cal}){
  const meses={};
  cal.forEach(c=>{
    if(!c.fecha)return;
    const m=c.fecha.substring(0,7);
    if(!meses[m])meses[m]={mes:m,comp:0,guar:0};
    meses[m].comp+=c.monto;
    meses[m].guar+=c.guardado;
  });
  const data=Object.values(meses).sort((a,b)=>a.mes.localeCompare(b.mes)).slice(-8);
  if(data.length===0)return null;

  const W=560,H=160,padL=8,padR=8,padT=16,padB=32;
  const chartW=W-padL-padR;
  const chartH=H-padT-padB;
  const maxVal=Math.max(...data.map(d=>d.comp),1);
  const barW=Math.floor(chartW/data.length);
  const gap=6;
  const bW=Math.max(barW-gap,8);

  return(
    <div style={{background:C.surface,borderRadius:10,padding:"14px 16px",border:`0.5px solid ${C.border}`,flex:1,minWidth:260}}>
      <div style={{fontSize:11,color:C.tm,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.5px"}}>Cobertura calendario · últimos {data.length} meses</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",overflow:"visible"}}>
        {/* Grid lines */}
        {[0.25,0.5,0.75,1].map(p=>(
          <line key={p} x1={padL} y1={padT+chartH*(1-p)} x2={W-padR} y2={padT+chartH*(1-p)}
            stroke={C.border} strokeWidth="0.5" strokeDasharray="3,3"/>
        ))}
        {data.map((d,i)=>{
          const x=padL+i*barW+gap/2;
          const pct=d.comp>0?Math.min(d.guar/d.comp,1):0;
          const hComp=chartH*(d.comp/maxVal);
          const hGuar=hComp*pct;
          const yComp=padT+chartH-hComp;
          const yGuar=padT+chartH-hGuar;
          const ok=pct>=0.9;
          const partial=pct>=0.5&&pct<0.9;
          const barColor=ok?C.green:partial?C.amber:C.red;
          const isHoy=d.mes===getToday().substring(0,7);
          return(
            <g key={i}>
              {/* Barra comprometido (fondo) */}
              <rect x={x} y={yComp} width={bW} height={hComp}
                fill={C.surfaceAlt} rx={2}/>
              {/* Barra guardado */}
              <rect x={x} y={yGuar} width={bW} height={hGuar}
                fill={barColor} rx={2} opacity={0.85}/>
              {/* Indicador mes actual */}
              {isHoy&&<rect x={x} y={padT} width={bW} height={chartH} fill={C.accentD} rx={2}/>}
              {/* % encima */}
              <text x={x+bW/2} y={yComp-4} textAnchor="middle"
                fontSize="8" fill={ok?C.green:partial?C.amber:C.td} fontWeight={isHoy?"700":"400"}>
                {Math.round(pct*100)}%
              </text>
              {/* Label mes */}
              <text x={x+bW/2} y={H-6} textAnchor="middle"
                fontSize="9" fill={isHoy?C.accent:C.td}>
                {mesLabel(d.mes)}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{display:"flex",gap:12,marginTop:4}}>
        <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.td}}>
          <div style={{width:10,height:10,borderRadius:2,background:C.green}}/> ≥90%
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.td}}>
          <div style={{width:10,height:10,borderRadius:2,background:C.amber}}/> 50-89%
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.td}}>
          <div style={{width:10,height:10,borderRadius:2,background:C.red}}/> &lt;50%
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.td}}>
          <div style={{width:10,height:10,borderRadius:2,background:C.surfaceAlt,border:`1px solid ${C.border}`}}/> Comprometido
        </div>
      </div>
    </div>
  );
}

// ─── GRÁFICO DONA DAP ────────────────────────────────────────────────────────
function GraficoDonaDap({C, dap}){
  const vigentes=dap.filter(d=>d.vigente==="si"||d.vigente==="sí");
  const grupos=[
    {label:"Trabajo",  key:"trabajo",  color:C.accent},
    {label:"Inversión",key:"inversion",color:C.amber},
    {label:"Crédito",  key:"credito",  color:C.cyan},
  ];
  const totales=grupos.map(g=>({
    ...g,
    monto:vigentes.filter(d=>clas(d.tipo)===g.key).reduce((s,d)=>s+d.montoInicial,0),
  })).filter(g=>g.monto>0);

  const total=totales.reduce((s,g)=>s+g.monto,0);
  if(total===0)return null;

  // Dona SVG
  const cx=60,cy=60,R=50,r=30;
  let startAngle=0;
  const slices=totales.map(g=>{
    const angle=(g.monto/total)*2*Math.PI;
    const endAngle=startAngle+angle;
    const x1=cx+R*Math.sin(startAngle);
    const y1=cy-R*Math.cos(startAngle);
    const x2=cx+R*Math.sin(endAngle);
    const y2=cy-R*Math.cos(endAngle);
    const xi1=cx+r*Math.sin(startAngle);
    const yi1=cy-r*Math.cos(startAngle);
    const xi2=cx+r*Math.sin(endAngle);
    const yi2=cy-r*Math.cos(endAngle);
    const large=angle>Math.PI?1:0;
    const path=`M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${r} ${r} 0 ${large} 0 ${xi1} ${yi1} Z`;
    const slice={...g,path,startAngle,endAngle};
    startAngle=endAngle;
    return slice;
  });

  return(
    <div style={{background:C.surface,borderRadius:10,padding:"14px 16px",border:`0.5px solid ${C.border}`,flex:1,minWidth:220}}>
      <div style={{fontSize:11,color:C.tm,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.5px"}}>Distribución DAP vigentes</div>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <svg viewBox="0 0 120 120" style={{width:100,height:100,flexShrink:0}}>
          {slices.map((s,i)=>(
            <path key={i} d={s.path} fill={s.color} opacity={0.85} stroke={C.surface} strokeWidth="1.5"/>
          ))}
          <text x={cx} y={cy-4} textAnchor="middle" fontSize="8" fill={C.tm}>TOTAL</text>
          <text x={cx} y={cy+8} textAnchor="middle" fontSize="10" fontWeight="700" fill={C.text}>{fS(total)}</text>
        </svg>
        <div style={{flex:1}}>
          {totales.map((g,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:g.color}}/>
                <span style={{fontSize:12,color:C.tm}}>{g.label}</span>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:"monospace"}}>{fS(g.monto)}</div>
                <div style={{fontSize:10,color:C.td}}>{Math.round(g.monto/total*100)}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TAB RESUMEN ─────────────────────────────────────────────────────────────
function TabResumen({C,bancos,dap,cal,ffmm,leasingDetalle,leasingResumen,creditoPendiente,saldoInsoluto,alertas}){
  const hoy=getToday();
  const bancosHoy=bancos.filter(b=>b.fecha===hoy);
  const saldosIni=bancosHoy.filter(b=>b.descripcion==="Saldo Inicial");
  const totalIni=saldosIni.reduce((s,b)=>s+(b.saldoInicial||0),0);
  const ultimo={};bancosHoy.forEach(b=>{if(b.saldoFinal!=null)ultimo[b.banco]=b.saldoFinal;});
  const saldoAct=Object.values(ultimo).reduce((s,v)=>s+v,0);

  const dapsV=dap.filter(d=>d.vigente==="si"||d.vigente==="sí");
  const totalDAP=dapsV.reduce((s,d)=>s+d.montoInicial,0);
  const totalGanDAP=dapsV.reduce((s,d)=>s+d.ganancia,0);
  const ganHistorica=dap.reduce((s,d)=>s+d.ganancia,0);
  const trab=dapsV.filter(d=>clas(d.tipo)==='trabajo');
  const inv=dapsV.filter(d=>clas(d.tipo)==='inversion');
  const cred=dapsV.filter(d=>clas(d.tipo)==='credito');

  const totalFFMMInv=ffmm.reduce((s,f)=>s+f.invertido,0);
  const totalFFMMAct=ffmm.reduce((s,f)=>s+f.valorActual,0);
  const totalGanFFMM=ffmm.reduce((s,f)=>s+f.rentabilidad,0);

  const mesActual=hoy.substring(0,7);
  const calMes=cal.filter(c=>c.fecha&&c.fecha.startsWith(mesActual));
  const compMes=calMes.reduce((s,c)=>s+c.monto,0);
  const guarMes=calMes.reduce((s,c)=>s+c.guardado,0);
  const pctMes=compMes>0?guarMes/compMes:0;

  const finSemana=new Date(hoy+"T12:00:00");
  finSemana.setDate(finSemana.getDate()+(7-finSemana.getDay()));
  const finSemStr=`${finSemana.getFullYear()}-${String(finSemana.getMonth()+1).padStart(2,"0")}-${String(finSemana.getDate()).padStart(2,"0")}`;
  const semComps=cal.filter(c=>c.fecha>=hoy&&c.fecha<=finSemStr);
  const semCubierta=semComps.length===0||semComps.every(c=>c.falta===0);
  const faltaSem=semComps.reduce((s,c)=>s+c.falta,0);

  const proxComp=cal.filter(c=>c.fecha>=hoy).slice(0,5);
  const proxDAP=dapsV.filter(d=>d.vencimiento>hoy).sort((a,b)=>a.vencimiento.localeCompare(b.vencimiento)).slice(0,5);

  const totalDeudaLeasingUF=leasingDetalle.reduce((s,d)=>s+d.deudaUF,0);
  const nContratosLeasing=leasingDetalle.length;
  const cuotaDia5 =leasingDetalle.filter(d=>d.diaVto===5 ||d.diaVto===4 ).reduce((s,d)=>s+d.cuotaCLPcIVA,0);
  const cuotaDia15=leasingDetalle.filter(d=>d.diaVto===15||d.diaVto===14).reduce((s,d)=>s+d.cuotaCLPcIVA,0);
  const cuotaTotalLeasing=leasingDetalle.reduce((s,d)=>s+d.cuotaCLPcIVA,0);
  const deudaLeasingSIVACLP=leasingDetalle.reduce((s,d)=>s+(d.cuotaCLPsIVA*d.cuotasPorPagar),0);

  const cuotasCreditoPend=creditoPendiente.length;
  const proximaCuotaCredito=creditoPendiente.find(c=>c.valorCuota>0)||creditoPendiente[0]||null;

  const noData=bancosHoy.length===0;
  const mesLabelAct=new Date(hoy+"T12:00:00").toLocaleDateString("es-CL",{month:"long"});

  const colorAlerta=(tipo,C)=>tipo==="urgente"?{bg:C.redD,border:C.red+"55",text:C.red}:tipo==="atencion"?{bg:C.amberD,border:C.amber+"55",text:C.amberT}:{bg:C.accentD,border:C.accent+"55",text:C.accent};

  return(<div>
    {/* Banner estado semana */}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:alertas.length>0?8:14,padding:"8px 12px",borderRadius:8,background:noData?C.amberD:semCubierta?C.greenD:C.amberD,border:`0.5px solid ${noData?C.amber+"44":semCubierta?C.green+"44":C.amber+"44"}`}}>
      <span style={{fontSize:14}}>{noData?"○":semCubierta?"●":"◐"}</span>
      <span style={{fontSize:13,color:noData?C.amberT:semCubierta?C.greenT:C.amberT,fontWeight:500}}>
        {noData?"Sin movimientos bancarios hoy — ingresa los saldos en la hoja Bancos":semCubierta?"Semana cubierta — compromisos al día":`Faltan ${f(faltaSem)} para cubrir la semana`}
      </span>
    </div>
    {alertas.length>0&&<div style={{marginBottom:14,display:"flex",flexDirection:"column",gap:4}}>
      {alertas.slice(0,3).map((a,i)=>{const col=colorAlerta(a.tipo,C);return(
        <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8,background:col.bg,border:`0.5px solid ${col.border}`}}>
          <span style={{fontSize:13}}>{a.icono}</span>
          <div style={{flex:1,minWidth:0}}>
            <span style={{fontSize:12,fontWeight:600,color:col.text,marginRight:8}}>{a.titulo.toUpperCase()}</span>
            <span style={{fontSize:12,color:C.tm}}>{a.mensaje}</span>
          </div>
        </div>
      );})}
      {alertas.length>3&&<div style={{fontSize:11,color:C.td,paddingLeft:12}}>+{alertas.length-3} alertas más — ver pestaña Alertas</div>}
    </div>}

    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
      <Metric C={C} label="Saldo cuentas hoy" value={saldoAct>0?f(saldoAct):"Sin datos"} sub={totalIni>0?`Inicial: ${f(totalIni)}`:undefined}/>
      <Metric C={C} label="En DAP vigentes" value={f(totalDAP)} sub={`${trab.length} trabajo · ${inv.length} inversión · ${cred.length} crédito`} color={C.amber}/>
      <Metric C={C} label="Fondos mutuos" value={totalFFMMAct>0?f(totalFFMMAct):f(totalFFMMInv)} sub={totalGanFFMM>0?`Rent: +${fS(totalGanFFMM)}`:undefined} color={C.purple}/>
      <Metric C={C} label={`${mesLabelAct} cubierto`} value={`${Math.round(pctMes*100)}%`} sub={`${f(guarMes)} de ${f(compMes)}`} color={pctMes>=.9?C.green:C.amber}/>
    </div>

    {nContratosLeasing>0&&<div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
      <div style={{background:C.surface,borderRadius:10,padding:"14px 16px",border:`0.5px solid ${C.border}`,flex:2,minWidth:260}}>
        <div style={{fontSize:11,color:C.tm,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.5px"}}>Leasing · {nContratosLeasing} contratos · {fUF(totalDeudaLeasingUF)} UF · <span style={{color:C.teal}}>{f(deudaLeasingSIVACLP)}</span> s/IVA</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {cuotaDia5>0&&<div style={{flex:1,minWidth:100}}>
            <div style={{fontSize:11,color:C.td,marginBottom:2}}>Día 5 c/mes</div>
            <div style={{fontSize:16,fontWeight:600,color:C.teal,fontFamily:"monospace"}}>{f(cuotaDia5)}</div>
          </div>}
          {cuotaDia15>0&&<div style={{flex:1,minWidth:100}}>
            <div style={{fontSize:11,color:C.td,marginBottom:2}}>Día 15 c/mes</div>
            <div style={{fontSize:16,fontWeight:600,color:C.teal,fontFamily:"monospace"}}>{f(cuotaDia15)}</div>
          </div>}
          <div style={{flex:1,minWidth:100,borderLeft:`0.5px solid ${C.border}`,paddingLeft:10}}>
            <div style={{fontSize:11,color:C.td,marginBottom:2}}>Total c/IVA</div>
            <div style={{fontSize:16,fontWeight:700,color:C.amber,fontFamily:"monospace"}}>{f(cuotaTotalLeasing)}</div>
          </div>
        </div>
      </div>
      {saldoInsoluto>0&&<div style={{background:C.surface,borderRadius:10,padding:"14px 16px",border:`0.5px solid ${C.border}`,flex:1,minWidth:160}}>
        <div style={{fontSize:11,color:C.tm,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>Crédito comercial</div>
        <div style={{fontSize:20,fontWeight:700,color:C.red,fontFamily:"monospace"}}>{f(saldoInsoluto)}</div>
        <div style={{fontSize:11,color:C.td,marginTop:4}}>{cuotasCreditoPend} cuotas · capital+intereses</div>
        {proximaCuotaCredito&&<div style={{fontSize:11,color:C.td}}>Próxima: {fd(proximaCuotaCredito.fechaVenc)} · {f(proximaCuotaCredito.valorCuota)}</div>}
      </div>}
      {(deudaLeasingSIVACLP>0||saldoInsoluto>0)&&<div style={{background:C.surfaceAlt,borderRadius:10,padding:"14px 16px",border:`0.5px solid ${C.borderL}`,flex:1,minWidth:160}}>
        <div style={{fontSize:11,color:C.tm,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>Deuda total a pagar</div>
        <div style={{fontSize:20,fontWeight:700,color:C.red,fontFamily:"monospace"}}>{f(deudaLeasingSIVACLP+saldoInsoluto)}</div>
        <div style={{fontSize:10,color:C.td,marginTop:4}}>Leasing s/IVA: {f(deudaLeasingSIVACLP)}</div>
        <div style={{fontSize:10,color:C.td}}>Crédito cap+int: {f(saldoInsoluto)}</div>
      </div>}
    </div>}

    {/* ── Consolidado inversiones ── */}
    <div style={{background:C.surface,borderRadius:10,padding:16,border:`0.5px solid ${C.border}`,marginBottom:12}}>
      <div style={{fontSize:12,color:C.tm,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.5px"}}>Consolidado inversiones</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:"6px 16px",fontSize:13}}>
        <div style={{color:C.td,fontSize:11}}>Concepto</div><div style={{color:C.td,fontSize:11,textAlign:"right"}}>Monto</div><div style={{color:C.td,fontSize:11,textAlign:"right"}}>Ganancia</div>
        <div style={{color:C.text}}>DAP Trabajo</div><div style={{textAlign:"right",fontFamily:"monospace",color:C.text}}>{fS(trab.reduce((s,d)=>s+d.montoInicial,0))}</div><div style={{textAlign:"right",fontFamily:"monospace",color:C.green}}>+{fS(trab.reduce((s,d)=>s+d.ganancia,0))}</div>
        <div style={{color:C.text}}>DAP Inversión</div><div style={{textAlign:"right",fontFamily:"monospace",color:C.text}}>{fS(inv.reduce((s,d)=>s+d.montoInicial,0))}</div><div style={{textAlign:"right",fontFamily:"monospace",color:C.green}}>+{fS(inv.reduce((s,d)=>s+d.ganancia,0))}</div>
        <div style={{color:C.text}}>DAP Crédito</div><div style={{textAlign:"right",fontFamily:"monospace",color:C.text}}>{fS(cred.reduce((s,d)=>s+d.montoInicial,0))}</div><div style={{textAlign:"right",fontFamily:"monospace",color:C.green}}>+{fS(cred.reduce((s,d)=>s+d.ganancia,0))}</div>
        <div style={{color:C.text}}>Fondos Mutuos</div><div style={{textAlign:"right",fontFamily:"monospace",color:C.text}}>{fS(totalFFMMInv)}</div><div style={{textAlign:"right",fontFamily:"monospace",color:C.green}}>+{fS(totalGanFFMM)}</div>
        <div style={{borderTop:`0.5px solid ${C.border}`,paddingTop:6,fontWeight:600,color:C.text}}>Total</div>
        <div style={{borderTop:`0.5px solid ${C.border}`,paddingTop:6,textAlign:"right",fontFamily:"monospace",fontWeight:600,color:C.accent}}>{fS(totalDAP+totalFFMMInv)}</div>
        <div style={{borderTop:`0.5px solid ${C.border}`,paddingTop:6,textAlign:"right",fontFamily:"monospace",fontWeight:600,color:C.green}}>+{fS(totalGanDAP+totalGanFFMM)}</div>
      </div>
      <div style={{marginTop:8,fontSize:11,color:C.td}}>Ganancia histórica DAP: {f(ganHistorica)}</div>
    </div>

    {/* ── Gráficos ── */}
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
      <GraficoCobertura C={C} cal={cal}/>
      <GraficoDonaDap C={C} dap={dap}/>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <div style={{background:C.surface,borderRadius:10,padding:16,border:`0.5px solid ${C.border}`}}>
        <div style={{fontSize:12,color:C.tm,marginBottom:10,textTransform:"uppercase"}}>Próximos compromisos</div>
        {proxComp.length===0?<div style={{fontSize:12,color:C.td,fontStyle:"italic"}}>Sin compromisos próximos</div>:
        proxComp.map((c,i)=>{const d=dd(hoy,c.fecha);const ok=c.falta===0;return(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:i<proxComp.length-1?`0.5px solid ${C.border}`:"none"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:ok?C.green:C.amber,flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.concepto}</div><div style={{fontSize:11,color:C.td}}>{fdf(c.fecha)} · {d===0?"hoy":d===1?"mañana":`en ${d}d`}</div></div>
            <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:13,fontWeight:500,color:ok?C.green:C.text}}>{fS(c.monto)}</div>{!ok&&<div style={{fontSize:10,color:C.red}}>Falta {fS(c.falta)}</div>}</div>
          </div>);})}
      </div>
      <div style={{background:C.surface,borderRadius:10,padding:16,border:`0.5px solid ${C.border}`}}>
        <div style={{fontSize:12,color:C.tm,marginBottom:10,textTransform:"uppercase"}}>DAPs próximos a vencer</div>
        {proxDAP.length===0?<div style={{fontSize:12,color:C.td,fontStyle:"italic"}}>Sin DAPs por vencer</div>:
        proxDAP.map((d,i)=>{const dias=dd(hoy,d.vencimiento);const tc=colorTipo(clas(d.tipo),C);return(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:i<proxDAP.length-1?`0.5px solid ${C.border}`:"none"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:tc.color,flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.comentario||`DAP ${d.banco}`}</div><div style={{fontSize:11,color:C.td}}>Vence {fdf(d.vencimiento)} · {dias===1?"mañana":`en ${dias}d`}</div></div>
            <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:13,fontWeight:500,color:C.text}}>{fS(d.montoInicial)}</div><div style={{fontSize:10,color:C.green}}>+{fS(d.ganancia)}</div></div>
          </div>);})}
      </div>
    </div>

    {Object.keys(ultimo).length>0&&<div style={{marginTop:12,background:C.surface,borderRadius:10,padding:16,border:`0.5px solid ${C.border}`}}>
      <div style={{fontSize:12,color:C.tm,marginBottom:10,textTransform:"uppercase"}}>Saldos por banco hoy</div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>{Object.entries(ultimo).map(([b,s])=>{const ini=saldosIni.find(x=>x.banco===b)?.saldoInicial||0;const diff=s-ini;return(
        <div key={b} style={{flex:1,minWidth:120,padding:"10px 12px",borderRadius:8,background:C.surfaceAlt}}><div style={{fontSize:11,color:C.tm,marginBottom:2}}>{b}</div><div style={{fontSize:16,fontWeight:600,color:C.text}}>{fS(s)}</div>{diff!==0&&<div style={{fontSize:11,color:diff>0?C.green:C.red}}>{diff>0?"+":""}{fS(diff)}</div>}</div>
      );})}</div>
    </div>}
  </div>);
}

// ─── TAB BANCOS ───────────────────────────────────────────────────────────────
function TabBancos({C,bancos}){
  const fechas=[...new Set(bancos.map(b=>b.fecha))].sort().reverse();
  const [fechaSel,setFechaSel]=useState(fechas[0]||"");
  const [bancoSel,setBancoSel]=useState("TODOS");
  const movs=bancos.filter(b=>b.fecha===fechaSel&&(bancoSel==="TODOS"||b.banco===bancoSel));
  const bancosUniq=[...new Set(bancos.filter(b=>b.fecha===fechaSel).map(b=>b.banco))];
  useEffect(()=>{if(fechas[0]&&!fechaSel)setFechaSel(fechas[0]);},[fechas.join(',')]);
  return(<div>
    <div style={{display:"flex",gap:10,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
      <select value={fechaSel} onChange={e=>{setFechaSel(e.target.value);setBancoSel("TODOS");}} style={{padding:"6px 12px",borderRadius:6,fontSize:12,background:C.surfaceAlt,color:C.text,border:`0.5px solid ${C.border}`}}>
        {fechas.map(f=><option key={f} value={f}>{new Date(f+"T12:00:00").toLocaleDateString("es-CL",{weekday:"short",day:"2-digit",month:"short",year:"numeric"})}</option>)}
      </select>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        {["TODOS",...bancosUniq].map(b=>(<button key={b} onClick={()=>setBancoSel(b)} style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:500,background:bancoSel===b?C.accent:C.surfaceAlt,color:bancoSel===b?"#fff":C.tm,border:`0.5px solid ${bancoSel===b?C.accent:C.border}`,cursor:"pointer"}}>{b}</button>))}
      </div>
    </div>
    <div style={{background:C.surface,borderRadius:10,border:`0.5px solid ${C.border}`,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr style={{borderBottom:`0.5px solid ${C.borderL}`}}>{["Banco","Descripción","Monto","Saldo","Comentario"].map(h=>(<th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,color:C.td,fontWeight:500,textTransform:"uppercase"}}>{h}</th>))}</tr></thead>
        <tbody>{movs.length===0?<tr><td colSpan={5} style={{padding:20,textAlign:"center",color:C.td}}>Sin movimientos para esta fecha</td></tr>:
          movs.map((m,i)=>(<tr key={i} style={{borderBottom:`0.5px solid ${C.border}`}}>
            <td style={{padding:"8px 12px",color:C.tm,fontSize:12}}>{m.banco}</td>
            <td style={{padding:"8px 12px"}}><span style={{padding:"2px 8px",borderRadius:4,fontSize:11,background:m.descripcion==="Saldo Inicial"?C.accentD:m.descripcion.includes("DAP")?C.amberD:"transparent",color:m.descripcion==="Saldo Inicial"?C.accent:m.descripcion.includes("DAP")?C.amber:C.text}}>{m.descripcion}</span></td>
            <td style={{padding:"8px 12px",fontWeight:500,color:m.monto==null?C.td:m.monto<0?C.red:C.green,fontFamily:"monospace"}}>{m.monto!=null?`${m.monto>0?"+":""}${fS(m.monto)}`:"—"}</td>
            <td style={{padding:"8px 12px",fontWeight:500,color:C.text,fontFamily:"monospace"}}>{m.saldoFinal!=null?fS(m.saldoFinal):"—"}</td>
            <td style={{padding:"8px 12px",color:C.td,fontSize:12}}>{m.comentario||"—"}</td>
          </tr>))}</tbody>
      </table>
    </div>
  </div>);
}

// ─── TAB CALENDARIO ───────────────────────────────────────────────────────────
function TabCalendario({C,cal}){
  const hoy=getToday();
  const meses={};cal.forEach(c=>{if(!c.fecha)return;const m=c.fecha.substring(0,7);if(!meses[m])meses[m]=[];meses[m].push(c);});
  return(<div>{Object.entries(meses).sort(([a],[b])=>a.localeCompare(b)).map(([mes,items])=>{
    const comp=items.reduce((s,c)=>s+c.monto,0);const guar=items.reduce((s,c)=>s+c.guardado,0);const pct=comp>0?Math.min(guar/comp,1):0;
    const label=new Date(mes+"-15").toLocaleDateString("es-CL",{month:"long",year:"numeric"});
    return(<div key={mes} style={{marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
        <div style={{fontSize:14,fontWeight:600,color:C.text,textTransform:"capitalize",minWidth:120}}>{label}</div>
        <div style={{flex:1,height:6,background:C.surfaceAlt,borderRadius:3}}><div style={{width:`${pct*100}%`,height:"100%",borderRadius:3,background:pct>=.9?C.green:pct>=.5?C.amber:C.red}}/></div>
        <div style={{fontSize:12,color:C.tm,minWidth:50,textAlign:"right"}}>{Math.round(pct*100)}%</div>
        <div style={{fontSize:12,color:C.td}}>{f(guar)} / {f(comp)}</div>
      </div>
      <div style={{background:C.surface,borderRadius:10,border:`0.5px solid ${C.border}`,overflow:"hidden"}}>
        {items.map((c,i)=>{const ok=c.falta===0;const past=c.fecha<hoy;const today=c.fecha===hoy;return(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:i<items.length-1?`0.5px solid ${C.border}`:"none",opacity:past?.5:1,background:today?C.accentD:"transparent"}}>
            <div style={{width:10,height:10,borderRadius:"50%",border:`2px solid ${ok?C.green:C.amber}`,background:ok?C.green:"transparent",flexShrink:0}}/>
            <div style={{minWidth:50,fontSize:12,color:C.tm}}>{fd(c.fecha)}</div>
            <div style={{flex:1}}><div style={{fontSize:13,color:C.text}}>{c.concepto}</div>{c.comentario&&<div style={{fontSize:11,color:C.td}}>{c.comentario}</div>}</div>
            <div style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:500,fontFamily:"monospace",color:ok?C.green:C.text}}>{fS(c.monto)}</div>{c.falta>0&&<div style={{fontSize:10,color:C.red}}>Falta: {fS(c.falta)}</div>}</div>
          </div>);})}
      </div>
    </div>);
  })}</div>);
}

// ─── TAB FLUJO DE CAJA ────────────────────────────────────────────────────────
function TabFlujoCaja({C, ventas, calendario, leasingDetalle, creditoPendiente}){
  const [vista, setVista] = useState('12m'); // '30d' | '12m'
  const hoy = getToday();
  const hoyD = new Date(hoy + "T12:00:00");

  // ── Egresos comprometidos por mes desde calendario + leasing + crédito ─────
  const egresosPorMes = {};
  // Calendario
  calendario.forEach(c => {
    if (!c.fecha) return;
    const mes = c.fecha.substring(0, 7);
    if (!egresosPorMes[mes]) egresosPorMes[mes] = 0;
    egresosPorMes[mes] += c.monto;
  });
  // Cuota leasing mensual → distribuir en los próximos meses
  const cuotaLeasingMes = leasingDetalle.reduce((s, d) => s + d.cuotaCLPsIVA, 0); // s/IVA = lo que sale neto
  // Cuota crédito mensual
  const cuotaCreditoMes = creditoPendiente.length > 0 ? (creditoPendiente[0].valorCuota || 0) : 0;

  // ── Datos 12 MESES ────────────────────────────────────────────────────────
  // Construir meses: últimos 6 históricos + próximos 6
  const mesesSet = new Set();
  ventas.porMes.forEach(m => mesesSet.add(m.mes));
  // Agregar próximos 12 meses desde hoy para egresos proyectados
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoyD.getFullYear(), hoyD.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    mesesSet.add(key);
  }
  const meses12 = [...mesesSet].sort().slice(-14); // últimos 14 meses max

  const ventasPorMes = {};
  ventas.porMes.forEach(m => { ventasPorMes[m.mes] = m.montoReal; });

  const data12 = meses12.map(mes => {
    const ingreso = ventasPorMes[mes] || 0;
    const egresosCal = egresosPorMes[mes] || 0;
    // Sumar leasing + crédito solo para meses futuros y presente
    const esFuturo = mes >= hoy.substring(0, 7);
    const egresosTotal = esFuturo ? egresosCal + cuotaLeasingMes + cuotaCreditoMes : egresosCal;
    const neto = ingreso - egresosTotal;
    return { mes, ingreso, egresos: egresosTotal, neto };
  });

  // Saldo acumulado 12m (partiendo desde 0 para mostrar tendencia)
  let acum12 = 0;
  const data12conAcum = data12.map(d => {
    acum12 += d.neto;
    return { ...d, acum: acum12 };
  });

  // ── Datos 30 DÍAS ─────────────────────────────────────────────────────────
  const dias30 = [];
  for (let i = -7; i < 30; i++) {
    const d = new Date(hoyD);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    dias30.push(key);
  }

  const ventasPorDia = {};
  ventas.porDia.forEach(d => { ventasPorDia[d.fecha] = d.montoReal; });
  const egresosPorDia = {};
  calendario.forEach(c => { if (c.fecha) egresosPorDia[c.fecha] = (egresosPorDia[c.fecha] || 0) + c.monto; });
  // Leasing: distribuir en sus días de vto
  const diasVtoLeasing = [...new Set(leasingDetalle.map(d => d.diaVto))];
  dias30.forEach(fecha => {
    const diaNum = parseInt(fecha.split('-')[2], 10);
    if (diasVtoLeasing.includes(diaNum)) {
      const cuotaDia = leasingDetalle.filter(d => d.diaVto === diaNum).reduce((s, d) => s + d.cuotaCLPsIVA, 0);
      egresosPorDia[fecha] = (egresosPorDia[fecha] || 0) + cuotaDia;
    }
  });
  // Crédito: en su fecha de vencimiento
  creditoPendiente.forEach(c => {
    if (c.fechaVenc && dias30.includes(c.fechaVenc)) {
      egresosPorDia[c.fechaVenc] = (egresosPorDia[c.fechaVenc] || 0) + c.valorCuota;
    }
  });

  const data30 = dias30.map(fecha => ({
    fecha,
    ingreso: ventasPorDia[fecha] || 0,
    egresos: egresosPorDia[fecha] || 0,
    neto: (ventasPorDia[fecha] || 0) - (egresosPorDia[fecha] || 0),
    esHoy: fecha === hoy,
    esPasado: fecha < hoy,
  }));

  // ── Métricas resumen ──────────────────────────────────────────────────────
  const mesAct = hoy.substring(0, 7);
  const ingresoMesAct = ventasPorMes[mesAct] || 0;
  const egresoMesAct = (egresosPorMes[mesAct] || 0) + cuotaLeasingMes + cuotaCreditoMes;
  const netoMesAct = ingresoMesAct - egresoMesAct;
  const promedioIngMensual = data12.filter(d=>d.ingreso>0).reduce((s,d)=>s+d.ingreso,0) / Math.max(data12.filter(d=>d.ingreso>0).length,1);
  const mejorMes = [...data12].sort((a,b)=>b.neto-a.neto)[0];
  const peorMes  = [...data12].sort((a,b)=>a.neto-b.neto)[0];

  // ── SVG helper 12m: barras agrupadas + línea acumulado ────────────────────
  function Grafico12m(){
    const W=860, H=220, padL=10, padR=10, padT=20, padB=36;
    const chartW=W-padL-padR, chartH=H-padT-padB;
    const maxVal=Math.max(...data12conAcum.map(d=>Math.max(d.ingreso,d.egresos)),1);
    const minAcum=Math.min(...data12conAcum.map(d=>d.acum),0);
    const maxAcum=Math.max(...data12conAcum.map(d=>d.acum),1);
    const rangeAcum=maxAcum-minAcum||1;
    const barW=Math.floor(chartW/data12conAcum.length);
    const bPad=4; const bW=Math.max((barW-bPad*2)/2, 4);
    const scaleY=(v)=>chartH*(1-v/maxVal);
    const scaleAcum=(v)=>chartH*(1-(v-minAcum)/rangeAcum);

    const puntos=data12conAcum.map((d,i)=>{
      const cx=padL+i*barW+barW/2;
      const cy=padT+scaleAcum(d.acum);
      return `${cx},${cy}`;
    }).join(' ');

    return(
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}}>
        {[0.25,0.5,0.75,1].map(p=>(
          <line key={p} x1={padL} y1={padT+chartH*(1-p)} x2={W-padR} y2={padT+chartH*(1-p)}
            stroke={C.border} strokeWidth="0.5" strokeDasharray="3,3"/>
        ))}
        {/* Línea cero para acumulado */}
        {minAcum<0&&<line x1={padL} y1={padT+scaleAcum(0)} x2={W-padR} y2={padT+scaleAcum(0)}
          stroke={C.td} strokeWidth="0.5" strokeDasharray="4,2"/>}

        {data12conAcum.map((d,i)=>{
          const x=padL+i*barW+bPad;
          const esAct=d.mes===mesAct;
          const hIng=chartH*(d.ingreso/maxVal);
          const hEgr=chartH*(d.egresos/maxVal);
          return(
            <g key={i}>
              {esAct&&<rect x={padL+i*barW} y={padT} width={barW} height={chartH} fill={C.accentD} rx={2}/>}
              {/* Ingreso (verde) */}
              <rect x={x} y={padT+chartH-hIng} width={bW} height={hIng}
                fill={C.green} opacity={0.75} rx={2}/>
              {/* Egreso (rojo) */}
              <rect x={x+bW+1} y={padT+chartH-hEgr} width={bW} height={hEgr}
                fill={C.red} opacity={0.65} rx={2}/>
              {/* Label mes */}
              <text x={padL+i*barW+barW/2} y={H-6} textAnchor="middle"
                fontSize="8.5" fill={esAct?C.accent:C.td}>
                {mesLabel(d.mes)}
              </text>
            </g>
          );
        })}
        {/* Línea acumulado */}
        <polyline points={puntos} fill="none" stroke={C.amber} strokeWidth="1.5" strokeLinejoin="round"/>
        {data12conAcum.map((d,i)=>{
          const cx=padL+i*barW+barW/2;
          const cy=padT+scaleAcum(d.acum);
          return<circle key={i} cx={cx} cy={cy} r={2.5} fill={C.amber}/>;
        })}
      </svg>
    );
  }

  // ── SVG 30 días ───────────────────────────────────────────────────────────
  function Grafico30d(){
    const W=860, H=200, padL=10, padR=10, padT=16, padB=32;
    const chartW=W-padL-padR, chartH=H-padT-padB;
    const maxVal=Math.max(...data30.map(d=>Math.max(d.ingreso,d.egresos)),1);
    const barW=Math.floor(chartW/data30.length);
    const gap=2; const bW=Math.max(barW-gap,3);

    return(
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}}>
        {[0.5,1].map(p=>(
          <line key={p} x1={padL} y1={padT+chartH*(1-p)} x2={W-padR} y2={padT+chartH*(1-p)}
            stroke={C.border} strokeWidth="0.5" strokeDasharray="3,3"/>
        ))}
        {data30.map((d,i)=>{
          const x=padL+i*barW+gap/2;
          const hIng=chartH*(d.ingreso/maxVal);
          const hEgr=chartH*(d.egresos/maxVal);
          const dNum=parseInt(d.fecha.split('-')[2],10);
          const showLabel=dNum===1||dNum%5===0||d.esHoy;
          return(
            <g key={i}>
              {d.esHoy&&<rect x={padL+i*barW} y={padT} width={barW} height={chartH} fill={C.accentD}/>}
              {d.esPasado&&d.ingreso>0&&
                <rect x={x} y={padT+chartH-hIng} width={bW} height={hIng} fill={C.green} opacity={0.5} rx={1}/>}
              {!d.esPasado&&d.egresos>0&&
                <rect x={x} y={padT+chartH-hEgr} width={bW} height={hEgr} fill={C.red} opacity={0.55} rx={1}/>}
              {!d.esPasado&&d.ingreso>0&&
                <rect x={x} y={padT+chartH-hIng} width={bW} height={hIng} fill={C.green} opacity={0.75} rx={1}/>}
              {showLabel&&<text x={x+bW/2} y={H-4} textAnchor="middle"
                fontSize="8" fill={d.esHoy?C.accent:C.td}>
                {d.esHoy?"HOY":fd(d.fecha)}
              </text>}
            </g>
          );
        })}
      </svg>
    );
  }

  return(<div>
    {/* Métricas */}
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
      <Metric C={C} label={`Ingresos ${new Date(mesAct+"-15").toLocaleDateString("es-CL",{month:"long"})}`}
        value={ingresoMesAct>0?f(ingresoMesAct):"Sin datos"} sub="Facturado c/IVA" color={C.green}/>
      <Metric C={C} label="Egresos comprometidos"
        value={f(egresoMesAct)} sub="Cal + leasing s/IVA + crédito" color={C.red}/>
      <Metric C={C} label="Resultado neto"
        value={f(netoMesAct)} sub="Ingreso − egreso" color={netoMesAct>=0?C.green:C.red}/>
      <Metric C={C} label="Promedio ingreso/mes"
        value={f(promedioIngMensual)} sub="Histórico disponible" color={C.accent}/>
    </div>

    {/* Toggle vista */}
    <div style={{display:"flex",gap:0,marginBottom:14,background:C.surfaceAlt,borderRadius:8,padding:3,width:"fit-content",border:`0.5px solid ${C.border}`}}>
      {[['30d','Detalle 30 días'],['12m','Resumen 12 meses']].map(([k,label])=>(
        <button key={k} onClick={()=>setVista(k)} style={{
          padding:"6px 16px",borderRadius:6,fontSize:12,fontWeight:vista===k?600:400,
          background:vista===k?C.accent:"transparent",
          color:vista===k?"#fff":C.tm,border:"none",cursor:"pointer",transition:"all 0.15s"
        }}>{label}</button>
      ))}
    </div>

    {/* Gráfico */}
    <div style={{background:C.surface,borderRadius:10,padding:"16px",border:`0.5px solid ${C.border}`,marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontSize:12,color:C.tm,textTransform:"uppercase",letterSpacing:"0.5px"}}>
          {vista==='30d'?'Ingresos facturados vs egresos · ±7 días pasados + 30 días':'Ingresos vs egresos por mes · línea = neto acumulado'}
        </div>
        <div style={{display:"flex",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.td}}>
            <div style={{width:10,height:10,borderRadius:2,background:C.green,opacity:0.75}}/> Ingresos
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.td}}>
            <div style={{width:10,height:10,borderRadius:2,background:C.red,opacity:0.65}}/> Egresos
          </div>
          {vista==='12m'&&<div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.td}}>
            <div style={{width:20,height:2,background:C.amber,borderRadius:1}}/> Neto acum.
          </div>}
        </div>
      </div>
      {vista==='30d' ? <Grafico30d/> : <Grafico12m/>}
    </div>

    {/* Tabla resumen 12 meses */}
    {vista==='12m'&&<div style={{background:C.surface,borderRadius:10,border:`0.5px solid ${C.border}`,overflow:"hidden",marginBottom:14}}>
      <div style={{padding:"12px 14px",borderBottom:`0.5px solid ${C.borderL}`,fontSize:12,color:C.tm,textTransform:"uppercase"}}>
        Detalle mensual
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr>{["Mes","Ingresos (c/IVA)","Egresos","Neto","Neto acum.","Facturas"].map(h=>(
              <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:C.td,fontWeight:500,textTransform:"uppercase",whiteSpace:"nowrap",borderBottom:`0.5px solid ${C.borderL}`}}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {data12conAcum.map((d,i)=>{
              const esAct=d.mes===mesAct;
              const ventasInfo=ventas.porMes.find(v=>v.mes===d.mes);
              return(
                <tr key={i} style={{borderTop:`0.5px solid ${C.border}`,background:esAct?C.accentD:"transparent"}}>
                  <td style={{padding:"7px 12px",fontWeight:esAct?600:400,color:esAct?C.accent:C.text,whiteSpace:"nowrap",textTransform:"capitalize"}}>
                    {mesLabelLargo(d.mes)}
                  </td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",color:d.ingreso>0?C.green:C.td}}>
                    {d.ingreso>0?f(d.ingreso):"—"}
                  </td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",color:d.egresos>0?C.red:C.td}}>
                    {d.egresos>0?f(d.egresos):"—"}
                  </td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",fontWeight:600,color:d.neto>=0?C.green:C.red}}>
                    {d.ingreso>0||d.egresos>0?(d.neto>=0?"+":"")+f(d.neto):"—"}
                  </td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",color:d.acum>=0?C.text:C.red}}>
                    {f(d.acum)}
                  </td>
                  <td style={{padding:"7px 12px",color:C.tm,textAlign:"center"}}>
                    {ventasInfo?ventasInfo.facturas:"—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>}

    {/* Top clientes del mes */}
    {vista==='30d'&&<div style={{background:C.surface,borderRadius:10,padding:16,border:`0.5px solid ${C.border}`}}>
      <div style={{fontSize:12,color:C.tm,marginBottom:10,textTransform:"uppercase"}}>Top clientes · mes actual</div>
      {(()=>{
        const clientes={};
        ventas.rows.filter(r=>r.fecha.startsWith(mesAct)).forEach(r=>{
          if(!clientes[r.razonSocial]) clientes[r.razonSocial]={nombre:r.razonSocial,monto:0,facturas:0};
          clientes[r.razonSocial].monto+=r.montoReal;
          clientes[r.razonSocial].facturas+=1;
        });
        const top=Object.values(clientes).sort((a,b)=>b.monto-a.monto).slice(0,8);
        const totalTop=top.reduce((s,c)=>s+c.monto,0);
        if(top.length===0)return<div style={{fontSize:12,color:C.td,fontStyle:"italic"}}>Sin datos del mes actual</div>;
        return top.map((c,i)=>{
          const pct=totalTop>0?c.monto/totalTop:0;
          return(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<top.length-1?`0.5px solid ${C.border}`:"none"}}>
              <div style={{width:16,height:16,borderRadius:4,background:C.accentD,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:9,fontWeight:700,color:C.accent}}>{i+1}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.nombre}</div>
                <div style={{height:3,background:C.surfaceAlt,borderRadius:2,marginTop:3}}>
                  <div style={{height:"100%",width:`${pct*100}%`,background:C.accent,borderRadius:2}}/>
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:12,fontWeight:600,fontFamily:"monospace",color:C.text}}>{f(c.monto)}</div>
                <div style={{fontSize:10,color:C.td}}>{c.facturas} doc.</div>
              </div>
            </div>
          );
        });
      })()}
    </div>}

    {/* Mejor/peor mes */}
    {vista==='12m'&&mejorMes&&peorMes&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <div style={{background:C.surface,borderRadius:10,padding:"14px 16px",border:`0.5px solid ${C.green+"44"}`}}>
        <div style={{fontSize:11,color:C.td,marginBottom:4,textTransform:"uppercase"}}>Mejor mes</div>
        <div style={{fontSize:13,fontWeight:600,color:C.text,textTransform:"capitalize",marginBottom:2}}>{mesLabelLargo(mejorMes.mes)}</div>
        <div style={{fontSize:18,fontWeight:700,fontFamily:"monospace",color:C.green}}>+{f(mejorMes.neto)}</div>
        <div style={{fontSize:11,color:C.td,marginTop:3}}>{f(mejorMes.ingreso)} ingreso · {f(mejorMes.egresos)} egreso</div>
      </div>
      <div style={{background:C.surface,borderRadius:10,padding:"14px 16px",border:`0.5px solid ${C.red+"44"}`}}>
        <div style={{fontSize:11,color:C.td,marginBottom:4,textTransform:"uppercase"}}>Mes más ajustado</div>
        <div style={{fontSize:13,fontWeight:600,color:C.text,textTransform:"capitalize",marginBottom:2}}>{mesLabelLargo(peorMes.mes)}</div>
        <div style={{fontSize:18,fontWeight:700,fontFamily:"monospace",color:C.red}}>{f(peorMes.neto)}</div>
        <div style={{fontSize:11,color:C.td,marginTop:3}}>{f(peorMes.ingreso)} ingreso · {f(peorMes.egresos)} egreso</div>
      </div>
    </div>}
  </div>);
}

// ─── TAB INVERSIONES ─────────────────────────────────────────────────────────
function TabInversiones({C,dap}){
  const hoy=getToday();
  const vigentes=dap.filter(d=>d.vigente==="si"||d.vigente==="sí");
  const trab=vigentes.filter(d=>clas(d.tipo)==='trabajo');
  const inv=vigentes.filter(d=>clas(d.tipo)==='inversion');
  const cred=vigentes.filter(d=>clas(d.tipo)==='credito');
  const ganHist=dap.reduce((s,d)=>s+d.ganancia,0);
  return(<div>
    <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
      <Metric C={C} label="DAP trabajo" value={f(trab.reduce((s,d)=>s+d.montoInicial,0))} sub={`${trab.length} depósitos`}/>
      <Metric C={C} label="DAP inversión" value={f(inv.reduce((s,d)=>s+d.montoInicial,0))} sub={`${inv.length} depósitos`} color={C.amber}/>
      <Metric C={C} label="DAP crédito" value={f(cred.reduce((s,d)=>s+d.montoInicial,0))} sub={`${cred.length} depósitos`} color={C.cyan}/>
      <Metric C={C} label="Ganancia activos" value={f(vigentes.reduce((s,d)=>s+d.ganancia,0))} sub="Intereses vigentes" color={C.green}/>
      <Metric C={C} label="Ganancia histórica" value={f(ganHist)} sub="Desde 2022" color={C.green}/>
    </div>
    <div style={{background:C.surface,borderRadius:10,border:`0.5px solid ${C.border}`,overflow:"hidden"}}>
      <div style={{padding:"12px 14px",borderBottom:`0.5px solid ${C.borderL}`,fontSize:12,color:C.tm,textTransform:"uppercase"}}>DAPs vigentes ({vigentes.length})</div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["Tipo","Banco","Inicio","Vence","Días","Tasa","Monto","Ganancia","Para qué"].map(h=>(<th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:10,color:C.td,fontWeight:500,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
          <tbody>{vigentes.sort((a,b)=>(a.vencimiento||"").localeCompare(b.vencimiento||"")).map((d,i)=>{const dias=d.vencimiento?dd(hoy,d.vencimiento):999;const tc=colorTipo(clas(d.tipo),C);return(
            <tr key={i} style={{borderTop:`0.5px solid ${C.border}`}}>
              <td style={{padding:"8px 10px"}}><span style={{padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:500,background:tc.bg,color:tc.color}}>{d.tipo}</span></td>
              <td style={{padding:"8px 10px",color:C.tm}}>{d.banco}</td>
              <td style={{padding:"8px 10px",color:C.tm}}>{fd(d.fechaInicio)}</td>
              <td style={{padding:"8px 10px",color:dias<=3&&dias>=0?C.amber:C.text,fontWeight:dias<=3&&dias>=0?600:400}}>{fd(d.vencimiento)} {dias<=3&&dias>=0?`(${dias}d)`:""}</td>
              <td style={{padding:"8px 10px",color:C.tm,textAlign:"center"}}>{d.dias}</td>
              <td style={{padding:"8px 10px",color:C.tm}}>{d.tasa?(d.tasa*100).toFixed(2)+"%":"—"}</td>
              <td style={{padding:"8px 10px",fontFamily:"monospace",color:C.text,fontWeight:500}}>{fS(d.montoInicial)}</td>
              <td style={{padding:"8px 10px",fontFamily:"monospace",color:C.green}}>+{fS(d.ganancia)}</td>
              <td style={{padding:"8px 10px",color:C.td,maxWidth:200,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.comentario}</td>
            </tr>);})}</tbody>
        </table>
      </div>
    </div>
  </div>);
}

// ─── TAB FFMM ────────────────────────────────────────────────────────────────
function TabFFMM({C,ffmm,movimientos}){
  const totalInv=ffmm.reduce((s,f)=>s+f.invertido,0);
  const totalAct=ffmm.reduce((s,f)=>s+f.valorActual,0);
  const totalRent=ffmm.reduce((s,f)=>s+f.rentabilidad,0);
  return(<div>
    <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
      <Metric C={C} label="Total invertido" value={f(totalInv)} sub={`${ffmm.length} fondos activos`} color={C.purple}/>
      <Metric C={C} label="Valor actual" value={totalAct>0?f(totalAct):"Actualizar en hoja"} color={C.accent}/>
      <Metric C={C} label="Rentabilidad" value={totalRent>0?f(totalRent):"—"} sub={totalRent>0&&totalInv>0?`${(totalRent/totalInv*100).toFixed(2)}%`:undefined} color={C.green}/>
    </div>
    <div style={{background:C.surface,borderRadius:10,border:`0.5px solid ${C.border}`,overflow:"hidden",marginBottom:14}}>
      <div style={{padding:"12px 14px",borderBottom:`0.5px solid ${C.borderL}`,fontSize:12,color:C.tm,textTransform:"uppercase"}}>Saldos vigentes por fondo</div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr>{["Empresa","Fondo","Admin.","Invertido","Valor actual","Rent.","Rent. %"].map(h=>(<th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,color:C.td,fontWeight:500,textTransform:"uppercase"}}>{h}</th>))}</tr></thead>
          <tbody>{ffmm.length===0?<tr><td colSpan={7} style={{padding:20,textAlign:"center",color:C.td}}>Ingresa fondos mutuos en la hoja</td></tr>:
            ffmm.map((fm,i)=>(<tr key={i} style={{borderTop:`0.5px solid ${C.border}`}}>
              <td style={{padding:"8px 12px",color:C.text}}>{fm.empresa}</td>
              <td style={{padding:"8px 12px",color:C.text}}>{fm.fondo}</td>
              <td style={{padding:"8px 12px"}}><span style={{padding:"2px 8px",borderRadius:4,fontSize:11,background:C.purpleD,color:C.purple}}>{fm.admin}</span></td>
              <td style={{padding:"8px 12px",fontFamily:"monospace",color:C.text}}>{fS(fm.invertido)}</td>
              <td style={{padding:"8px 12px",fontFamily:"monospace",color:C.accent,fontWeight:500}}>{fm.valorActual>0?fS(fm.valorActual):"—"}</td>
              <td style={{padding:"8px 12px",fontFamily:"monospace",color:C.green}}>{fm.rentabilidad>0?`+${fS(fm.rentabilidad)}`:"—"}</td>
              <td style={{padding:"8px 12px",color:C.green,fontWeight:500}}>{fm.rentabilidad>0&&fm.invertido>0?`${(fm.rentabilidad/fm.invertido*100).toFixed(2)}%`:"—"}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
    {movimientos.length>0&&<div style={{background:C.surface,borderRadius:10,border:`0.5px solid ${C.border}`,overflow:"hidden"}}>
      <div style={{padding:"12px 14px",borderBottom:`0.5px solid ${C.borderL}`,fontSize:12,color:C.tm,textTransform:"uppercase"}}>Historial de movimientos</div>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr>{["Fecha","Empresa","Fondo","Tipo","Monto"].map(h=>(<th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,color:C.td,fontWeight:500,textTransform:"uppercase"}}>{h}</th>))}</tr></thead>
        <tbody>{movimientos.map((m,i)=>(<tr key={i} style={{borderTop:`0.5px solid ${C.border}`}}>
          <td style={{padding:"8px 12px",color:C.tm}}>{fd(m.fecha)}</td>
          <td style={{padding:"8px 12px",color:C.text}}>{m.empresa}</td>
          <td style={{padding:"8px 12px",color:C.text}}>{m.fondo}</td>
          <td style={{padding:"8px 12px"}}><span style={{padding:"2px 8px",borderRadius:4,fontSize:11,background:m.tipo==="Aporte"?C.greenD:C.redD,color:m.tipo==="Aporte"?C.green:C.red}}>{m.tipo}</span></td>
          <td style={{padding:"8px 12px",fontFamily:"monospace",color:C.text,fontWeight:500}}>{fS(m.monto)}</td>
        </tr>))}</tbody>
      </table>
    </div>}
  </div>);
}

// ─── TAB LEASING ──────────────────────────────────────────────────────────────
function TabLeasing({C,leasingDetalle,leasingResumen}){
  const hoy=getToday();
  const totalDeudaUF=leasingDetalle.reduce((s,d)=>s+d.deudaUF,0);
  const totalCuotaCLP=leasingDetalle.reduce((s,d)=>s+d.cuotaCLPcIVA,0);
  const totalTractos=leasingDetalle.reduce((s,d)=>s+d.nTractos,0);
  const totalCuotasPorPagar=leasingDetalle.reduce((s,d)=>s+d.cuotasPorPagar,0);
  const porBanco={};
  leasingDetalle.forEach(d=>{
    const b=d.banco;
    if(!porBanco[b])porBanco[b]={deudaUF:0,cuota:0,contratos:0};
    porBanco[b].deudaUF+=d.deudaUF;
    porBanco[b].cuota+=d.cuotaCLPcIVA;
    porBanco[b].contratos+=1;
  });
  const proximas=leasingResumen.slice(0,3);
  return(<div>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
      <Metric C={C} label="Deuda total (UF)" value={fUF(totalDeudaUF)} sub={`${leasingDetalle.length} contratos activos`} color={C.teal}/>
      <Metric C={C} label="Tractos en leasing" value={totalTractos} sub="Unidades comprometidas" color={C.teal}/>
      <Metric C={C} label="Cuota mensual total" value={f(totalCuotaCLP)} sub="Con IVA · todos los bancos" color={C.amber}/>
      <Metric C={C} label="Cuotas por pagar" value={totalCuotasPorPagar} sub="Suma contratos activos" color={C.td}/>
    </div>
    {proximas.length>0&&<div style={{background:C.surface,borderRadius:10,padding:16,border:`0.5px solid ${C.border}`,marginBottom:14}}>
      <div style={{fontSize:12,color:C.tm,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.5px"}}>Próximas cuotas a pagar</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
        {proximas.map((r,i)=>{
          const bciTotal=(r.bciDia5||0)+(r.bciDia15||0);
          const esUrgente=i===0;
          return(
            <div key={i} style={{padding:"12px 14px",borderRadius:8,background:esUrgente?C.amberD:C.surfaceAlt,border:`0.5px solid ${esUrgente?C.amber+"55":C.border}`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text,textTransform:"capitalize"}}>{r.mes} {r.anio}</div>
                {esUrgente&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:C.amber+"33",color:C.amberT,fontWeight:600}}>PRÓXIMA</span>}
              </div>
              <div style={{fontSize:20,fontWeight:700,color:esUrgente?C.amberT:C.text,fontFamily:"monospace",marginBottom:4}}>{f(r.cuotaCLPcIVA)}</div>
              <div style={{fontSize:11,color:C.td}}>s/IVA: {f(r.cuotaCLPsIVA)}</div>
              <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                {bciTotal>0&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:4,background:C.accentD,color:C.accent}}>BCI {fUF(bciTotal)} UF</span>}
                {r.vfsVolvo>0&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:4,background:C.amberD,color:C.amber}}>VFS {fUF(r.vfsVolvo)} UF</span>}
                {r.bancoChile>0&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:4,background:C.tealD,color:C.teal}}>BancoChile {fUF(r.bancoChile)} UF</span>}
              </div>
              {r.contratosActivos>0&&<div style={{marginTop:6,fontSize:11,color:C.td}}>{r.contratosActivos} contratos activos</div>}
            </div>
          );
        })}
      </div>
    </div>}
    {Object.keys(porBanco).length>0&&<div style={{background:C.surface,borderRadius:10,padding:16,border:`0.5px solid ${C.border}`,marginBottom:14}}>
      <div style={{fontSize:12,color:C.tm,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.5px"}}>Cartera por emisor</div>
      <div style={{display:"grid",gridTemplateColumns:`repeat(${Object.keys(porBanco).length},1fr)`,gap:10}}>
        {Object.entries(porBanco).map(([banco,data])=>{
          const tc=colorBanco(banco,C);
          return(
            <div key={banco} style={{padding:"12px 14px",borderRadius:8,background:C.surfaceAlt}}>
              <span style={{padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:600,background:tc.bg,color:tc.color,marginBottom:8,display:"inline-block"}}>{banco}</span>
              <div style={{fontSize:16,fontWeight:600,color:C.text,fontFamily:"monospace",marginTop:4}}>{fUF(data.deudaUF)} UF</div>
              <div style={{fontSize:12,color:C.tm}}>{f(data.cuota)} / mes c/IVA</div>
              <div style={{fontSize:11,color:C.td,marginTop:2}}>{data.contratos} contrato{data.contratos!==1?"s":""}</div>
            </div>
          );
        })}
      </div>
    </div>}
    <div style={{background:C.surface,borderRadius:10,border:`0.5px solid ${C.border}`,overflow:"hidden",marginBottom:14}}>
      <div style={{padding:"12px 14px",borderBottom:`0.5px solid ${C.borderL}`,fontSize:12,color:C.tm,textTransform:"uppercase"}}>Contratos activos ({leasingDetalle.length})</div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["Banco","Tractos","Cuota c/IVA","Cuotas x Pagar","Vencimiento","Deuda UF"].map(h=>(<th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:C.td,fontWeight:500,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
          <tbody>
            {leasingDetalle.length===0
              ?<tr><td colSpan={6} style={{padding:20,textAlign:"center",color:C.td}}>Sin contratos activos</td></tr>
              :leasingDetalle.map((d,i)=>{
                const tc=colorBanco(d.banco,C);
                const diasFin=d.fechaFin?dd(hoy,d.fechaFin):9999;
                const venceProx=diasFin<=60&&diasFin>=0;
                return(
                  <tr key={i} style={{borderTop:`0.5px solid ${C.border}`,background:i%2===0?"transparent":C.surfaceAlt+"55"}}>
                    <td style={{padding:"8px 12px"}}><span style={{padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:500,background:tc.bg,color:tc.color}}>{d.banco}</span></td>
                    <td style={{padding:"8px 12px",color:C.text,fontWeight:500,textAlign:"center"}}>{d.nTractos}</td>
                    <td style={{padding:"8px 12px",fontFamily:"monospace",color:C.text,fontWeight:600}}>{fS(d.cuotaCLPcIVA)}</td>
                    <td style={{padding:"8px 12px",color:C.text,textAlign:"center"}}>{d.cuotasPorPagar}</td>
                    <td style={{padding:"8px 12px",color:venceProx?C.amber:C.text,fontWeight:venceProx?600:400,whiteSpace:"nowrap"}}>{fd(d.fechaFin)}{venceProx?` (${diasFin}d)`:""}</td>
                    <td style={{padding:"8px 12px",fontFamily:"monospace",color:C.teal,fontWeight:500}}>{fUF(d.deudaUF)}</td>
                  </tr>
                );
              })
            }
          </tbody>
          {leasingDetalle.length>1&&<tfoot>
            <tr style={{borderTop:`1px solid ${C.borderL}`,background:C.surfaceAlt}}>
              <td style={{padding:"8px 12px",fontWeight:600,color:C.text,fontSize:11}}>TOTAL</td>
              <td style={{padding:"8px 12px",fontWeight:600,color:C.text,textAlign:"center"}}>{totalTractos}</td>
              <td style={{padding:"8px 12px",fontFamily:"monospace",fontWeight:700,color:C.amber}}>{fS(totalCuotaCLP)}</td>
              <td style={{padding:"8px 12px",fontWeight:600,color:C.text,textAlign:"center"}}>{totalCuotasPorPagar}</td>
              <td style={{padding:"8px 12px"}}></td>
              <td style={{padding:"8px 12px",fontFamily:"monospace",fontWeight:700,color:C.teal}}>{fUF(totalDeudaUF)}</td>
            </tr>
          </tfoot>}
        </table>
      </div>
    </div>
    {leasingResumen.length>0&&<div style={{background:C.surface,borderRadius:10,border:`0.5px solid ${C.border}`,overflow:"hidden"}}>
      <div style={{padding:"12px 14px",borderBottom:`0.5px solid ${C.borderL}`,fontSize:12,color:C.tm,textTransform:"uppercase"}}>Proyección mensual de cuotas</div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["Mes","Cuota c/IVA","BCI","VFS Volvo","Banco Chile","Contratos","Vence"].map(h=>(<th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:C.td,fontWeight:500,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
          <tbody>
            {leasingResumen.map((r,i)=>{
              const bciTotal=(r.bciDia5||0)+(r.bciDia15||0);
              const esActual=i===0;
              return(
                <tr key={i} style={{borderTop:`0.5px solid ${C.border}`,background:esActual?C.tealD:"transparent"}}>
                  <td style={{padding:"8px 12px",fontWeight:esActual?600:400,color:C.text,whiteSpace:"nowrap",textTransform:"capitalize"}}>{r.mes} {r.anio}</td>
                  <td style={{padding:"8px 12px",fontFamily:"monospace",fontWeight:esActual?700:500,color:esActual?C.teal:C.text}}>{fS(r.cuotaCLPcIVA)}</td>
                  <td style={{padding:"8px 12px",fontFamily:"monospace",color:C.accent}}>{bciTotal>0?fUF(bciTotal):"—"}</td>
                  <td style={{padding:"8px 12px",fontFamily:"monospace",color:C.amber}}>{r.vfsVolvo>0?fUF(r.vfsVolvo):"—"}</td>
                  <td style={{padding:"8px 12px",fontFamily:"monospace",color:C.teal}}>{r.bancoChile>0?fUF(r.bancoChile):"—"}</td>
                  <td style={{padding:"8px 12px",color:C.tm,textAlign:"center"}}>{r.contratosActivos||"—"}</td>
                  <td style={{padding:"8px 12px",color:r.vesteEstesMes?C.amber:C.td,fontSize:11}}>{r.vesteEstesMes||"—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>}
  </div>);
}

// ─── TAB CRÉDITO ──────────────────────────────────────────────────────────────
function TabCredito({C,credito,creditoPendiente,saldoInsoluto}){
  const hoy=getToday();
  const totalCuotas=credito.length;
  const pagadas=credito.filter(c=>c.fechaVenc<hoy).length;
  const totalIntereses=credito.reduce((s,c)=>s+c.interes,0);
  const interesesPend=creditoPendiente.reduce((s,c)=>s+c.interes,0);
  const cuotaMensual=creditoPendiente.length>0?creditoPendiente[0].valorCuota:0;
  const proxima=creditoPendiente[0]||null;
  const segunda=creditoPendiente[1]||null;
  return(<div>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
      <Metric C={C} label="Total a pagar" value={f(saldoInsoluto)} sub="Capital + intereses futuros" color={C.red}/>
      <Metric C={C} label="Cuotas pendientes" value={creditoPendiente.length} sub={`de ${totalCuotas} totales · pagadas: ${pagadas}`} color={C.amber}/>
      <Metric C={C} label="Cuota mensual" value={f(cuotaMensual)} sub="Capital + interés" color={C.text}/>
      <Metric C={C} label="Intereses pendientes" value={f(interesesPend)} sub={`Total histórico: ${f(totalIntereses)}`} color={C.td}/>
    </div>
    {(proxima||segunda)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
      {[proxima,segunda].filter(Boolean).map((c,i)=>{
        const dias=c.fechaVenc>=hoy?Math.ceil((new Date(c.fechaVenc)-new Date(hoy))/864e5):0;
        const esUrgente=dias<=5&&dias>=0;
        return(
          <div key={i} style={{background:C.surface,borderRadius:10,padding:"14px 16px",border:`0.5px solid ${esUrgente?C.amber+"66":C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:12,fontWeight:600,color:C.text}}>Cuota {c.nCuota}</span>
              {esUrgente&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:C.amberD,color:C.amberT,fontWeight:600}}>EN {dias}d</span>}
            </div>
            <div style={{fontSize:20,fontWeight:700,fontFamily:"monospace",color:esUrgente?C.amberT:C.text,marginBottom:6}}>{f(c.valorCuota)}</div>
            <div style={{fontSize:11,color:C.td}}>Vence: {fdf(c.fechaVenc)}</div>
            <div style={{display:"flex",gap:16,marginTop:8}}>
              <div><div style={{fontSize:10,color:C.td}}>Capital</div><div style={{fontSize:12,fontFamily:"monospace",color:C.text}}>{f(c.amortizacion)}</div></div>
              <div><div style={{fontSize:10,color:C.td}}>Interés</div><div style={{fontSize:12,fontFamily:"monospace",color:C.amber}}>{f(c.interes)}</div></div>
              <div><div style={{fontSize:10,color:C.td}}>Saldo tras pago</div><div style={{fontSize:12,fontFamily:"monospace",color:C.td}}>{f(c.saldoInsoluto)}</div></div>
            </div>
          </div>
        );
      })}
    </div>}
    <div style={{background:C.surface,borderRadius:10,border:`0.5px solid ${C.border}`,overflow:"hidden"}}>
      <div style={{padding:"12px 14px",borderBottom:`0.5px solid ${C.borderL}`,fontSize:12,color:C.tm,textTransform:"uppercase"}}>Tabla de amortización · {totalCuotas} cuotas</div>
      <div style={{overflowX:"auto",maxHeight:480,overflowY:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead style={{position:"sticky",top:0,background:C.surface,zIndex:1}}>
            <tr>{["N°","Vencimiento","Capital","Interés","Cuota","Saldo Insoluto"].map(h=>(
              <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:C.td,fontWeight:500,textTransform:"uppercase",whiteSpace:"nowrap",borderBottom:`0.5px solid ${C.borderL}`}}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {credito.map((c,i)=>{
              const pasada=c.fechaVenc<hoy;
              const esHoy=c.fechaVenc===hoy;
              return(
                <tr key={i} style={{borderTop:`0.5px solid ${C.border}`,opacity:pasada?0.45:1,background:esHoy?C.amberD:"transparent"}}>
                  <td style={{padding:"7px 12px",color:C.tm,fontWeight:500}}>{c.nCuota}</td>
                  <td style={{padding:"7px 12px",color:pasada?C.td:C.text,whiteSpace:"nowrap"}}>{fdf(c.fechaVenc)}</td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",color:C.text}}>{c.amortizacion>0?f(c.amortizacion):"—"}</td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",color:C.amber}}>{c.interes>0?f(c.interes):"—"}</td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",fontWeight:600,color:pasada?C.td:C.text}}>{c.valorCuota>0?f(c.valorCuota):"—"}</td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",color:C.teal}}>{f(c.saldoInsoluto)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>);
}

// ─── TAB ALERTAS ─────────────────────────────────────────────────────────────
function TabAlertas({C,alertas}){
  const colorConfig=(tipo,C)=>{
    if(tipo==="urgente") return{bg:C.redD,border:C.red+"55",badgeBg:C.red,badgeText:"#fff",label:"URGENTE",labelColor:C.red};
    if(tipo==="atencion") return{bg:C.amberD,border:C.amber+"55",badgeBg:C.amber,badgeText:"#000",label:"ATENCIÓN",labelColor:C.amberT};
    return{bg:C.accentD,border:C.accent+"55",badgeBg:C.accent,badgeText:"#fff",label:"INFO",labelColor:C.accent};
  };
  const urgentes=alertas.filter(a=>a.tipo==="urgente");
  const atenciones=alertas.filter(a=>a.tipo==="atencion");
  const infos=alertas.filter(a=>a.tipo==="info");
  if(alertas.length===0) return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",gap:12}}>
      <div style={{fontSize:32}}>✅</div>
      <div style={{fontSize:15,fontWeight:600,color:C.text}}>Sin alertas activas</div>
      <div style={{fontSize:13,color:C.td}}>Todos los vencimientos están bajo control esta semana</div>
    </div>
  );
  return(<div>
    <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
      {urgentes.length>0&&<div style={{padding:"10px 16px",borderRadius:8,background:C.redD,border:`0.5px solid ${C.red+"55"}`,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:18,fontWeight:700,color:C.red}}>{urgentes.length}</span>
        <span style={{fontSize:12,color:C.red,fontWeight:600,textTransform:"uppercase"}}>Urgente{urgentes.length!==1?"s":""}</span>
      </div>}
      {atenciones.length>0&&<div style={{padding:"10px 16px",borderRadius:8,background:C.amberD,border:`0.5px solid ${C.amber+"55"}`,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:18,fontWeight:700,color:C.amberT}}>{atenciones.length}</span>
        <span style={{fontSize:12,color:C.amberT,fontWeight:600,textTransform:"uppercase"}}>Atención{atenciones.length!==1?"":"es"}</span>
      </div>}
      {infos.length>0&&<div style={{padding:"10px 16px",borderRadius:8,background:C.accentD,border:`0.5px solid ${C.accent+"55"}`,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:18,fontWeight:700,color:C.accent}}>{infos.length}</span>
        <span style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase"}}>Info{infos.length!==1?"s":""}</span>
      </div>}
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {alertas.map((a,i)=>{
        const col=colorConfig(a.tipo,C);
        return(
          <div key={i} style={{background:col.bg,border:`0.5px solid ${col.border}`,borderRadius:10,padding:"14px 16px",display:"flex",gap:14,alignItems:"flex-start"}}>
            <div style={{width:36,height:36,borderRadius:8,background:col.badgeBg+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18}}>{a.icono}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:col.badgeBg,color:col.badgeText,letterSpacing:"0.5px"}}>{col.label}</span>
                <span style={{fontSize:13,fontWeight:600,color:C.text}}>{a.titulo}</span>
              </div>
              <div style={{fontSize:13,color:C.tm}}>{a.mensaje}</div>
              {a.fecha&&<div style={{fontSize:11,color:C.td,marginTop:4}}>{new Date(a.fecha+"T12:00:00").toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>}
            </div>
            <div style={{flexShrink:0,textAlign:"right"}}>
              <div style={{fontSize:22,fontWeight:700,color:col.labelColor,lineHeight:1}}>{a.dias}</div>
              <div style={{fontSize:10,color:C.td}}>días</div>
            </div>
          </div>
        );
      })}
    </div>
  </div>);
}

// ─── CALCULADORA ──────────────────────────────────────────────────────────────
function TabCalc({C}){
  const [lines,setLines]=useState([""]);
  const [history,setHistory]=useState([]);
  const parseToken=(s)=>{
    const c=s.replace(/\$/g,"").replace(/\./g,"").replace(/,/g,".").replace(/\s/g,"").toUpperCase();
    const mm=c.match(/^(\d+(?:\.\d+)?)MM$/);
    if(mm)return parseFloat(mm[1])*1e9;
    const m=c.match(/^(\d+(?:\.\d+)?)M$/);
    if(m)return parseFloat(m[1])*1e6;
    const n=parseFloat(c);
    return isNaN(n)?null:n;
  };
  const evalExpr=(input)=>{
    if(!input||!input.trim())return null;
    let s=input.replace(/\$/g,"").replace(/\s/g,"").toUpperCase();
    s=s.replace(/(\d[\d.,]*)(MM|M)?/gi,(_match,num,suffix)=>{
      const clean=num.replace(/\./g,"").replace(/,/g,".");
      const n=parseFloat(clean);
      if(isNaN(n))return "NaN";
      if(suffix){const su=suffix.toUpperCase();if(su==="MM")return String(n*1e9);if(su==="M")return String(n*1e6);}
      return String(n);
    });
    if(!/^[0-9.+\-*/() eE]+$/.test(s))return null;
    try{const result=new Function("return ("+s+")")();if(typeof result==="number"&&isFinite(result))return result;return null;}
    catch(e){return null;}
  };
  const vals=lines.map(l=>evalExpr(l.trim()));
  const total=vals.reduce((s,v)=>s+(v||0),0);
  const has=vals.some(v=>v!==null);
  const add=()=>setLines([...lines,""]);
  const upd=(i,v)=>{const n=[...lines];n[i]=v;setLines(n);};
  const rem=(i)=>{if(lines.length===1){setLines([""]);return;}setLines(lines.filter((_,x)=>x!==i));};
  const clear=()=>{if(has)setHistory([{lines:lines.filter(l=>l.trim()),total,ts:new Date().toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})},...history.slice(0,4)]);setLines([""]);};
  return(<div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:14}}>
    <div style={{background:C.surface,borderRadius:10,padding:16,border:`0.5px solid ${C.border}`}}>
      <div style={{fontSize:12,color:C.tm,marginBottom:6,textTransform:"uppercase"}}>Calculadora rápida</div>
      <div style={{fontSize:11,color:C.td,marginBottom:12}}>Soporta +, -, *, / · "M" = millones · "MM" = miles de millones · Ej: 500M+300M, 1.5MM*2</div>
      {lines.map((l,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <input type="text" value={l} onChange={e=>upd(i,e.target.value)} onKeyDown={e=>{if(e.key==="Enter")add();}} placeholder={i===0?"Ej: 500M+300M":""}
          style={{flex:1,padding:"8px 12px",borderRadius:6,fontSize:15,background:C.surfaceAlt,color:C.text,border:`0.5px solid ${C.border}`,fontFamily:"monospace",outline:"none"}}/>
        <span style={{fontSize:13,fontFamily:"monospace",color:vals[i]!=null?(vals[i]>=0?C.green:C.red):C.td,minWidth:100,textAlign:"right"}}>{vals[i]!=null?fS(vals[i]):""}</span>
        {lines.length>1&&<button onClick={()=>rem(i)} style={{background:"none",border:"none",color:C.td,cursor:"pointer",fontSize:16,padding:"0 4px"}}>×</button>}
      </div>))}
      <div style={{display:"flex",gap:8,marginTop:10}}>
        <button onClick={add} style={{padding:"6px 14px",borderRadius:6,fontSize:12,background:C.surfaceAlt,color:C.tm,border:`0.5px solid ${C.border}`,cursor:"pointer"}}>+ Línea</button>
        <button onClick={clear} style={{padding:"6px 14px",borderRadius:6,fontSize:12,background:C.surfaceAlt,color:C.tm,border:`0.5px solid ${C.border}`,cursor:"pointer"}}>Limpiar</button>
      </div>
      {has&&<div style={{marginTop:16,padding:"12px 14px",borderRadius:8,background:total>=0?C.greenD:C.redD,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:12,color:C.tm,textTransform:"uppercase"}}>Total</span>
        <span style={{fontSize:22,fontWeight:600,fontFamily:"monospace",color:total>=0?C.green:C.red}}>{f(total)}</span>
      </div>}
    </div>
    <div style={{background:C.surface,borderRadius:10,padding:16,border:`0.5px solid ${C.border}`}}>
      <div style={{fontSize:12,color:C.tm,marginBottom:10,textTransform:"uppercase"}}>Historial</div>
      {history.length===0?<div style={{fontSize:12,color:C.td,fontStyle:"italic"}}>Aparecerá al limpiar</div>:history.map((h,i)=>(
        <div key={i} style={{padding:"8px 0",borderBottom:i<history.length-1?`0.5px solid ${C.border}`:"none"}}>
          <div style={{fontSize:10,color:C.td}}>{h.ts}</div>
          <div style={{fontSize:12,color:C.tm}}>{h.lines.join(" | ")}</div>
          <div style={{fontSize:14,fontWeight:600,fontFamily:"monospace",color:h.total>=0?C.green:C.red}}>{f(h.total)}</div>
        </div>
      ))}
    </div>
  </div>);
}

// ─── APP ROOT ────────────────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState(0);
  const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('cmf-theme')||'dark';}catch(e){return'dark';}});
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [lastUpdate,setLastUpdate]=useState(null);
  const C=T[theme];

  const load=async()=>{
    try{setLoading(true);const d=await fetchAllData();setData(d);setLastUpdate(new Date());setError(null);}
    catch(e){setError(e.message);}
    finally{setLoading(false);}
  };

  useEffect(()=>{load();},[]);
  useEffect(()=>{try{localStorage.setItem('cmf-theme',theme);}catch(e){}},[theme]);
  useEffect(()=>{const iv=setInterval(load,5*60*1000);return()=>clearInterval(iv);},[]);

  const hoyStr=new Date().toLocaleDateString("en-CA");
  const alertasData=data?buildAlertas({dap:data.dap,cal:data.calendario,leasingDetalle:data.leasingDetalle,creditoPendiente:data.creditoPendiente},hoyStr):[];
  const nAlertas=alertasData.length;

  return(
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <div style={{padding:"14px 20px",borderBottom:`0.5px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:16,fontWeight:600,letterSpacing:"-0.3px"}}>Centro de mando financiero</div>
          <div style={{fontSize:11,color:C.td}}>Transportes Bello e Hijos Ltda. · {new Date().toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {lastUpdate&&<div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:C.green}}/><span style={{fontSize:11,color:C.tm}}>Actualizado: {lastUpdate.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})}</span></div>}
          <button onClick={load} style={{padding:"5px 10px",borderRadius:6,fontSize:11,background:C.surfaceAlt,color:C.tm,border:`0.5px solid ${C.border}`,cursor:"pointer"}}>↻</button>
          <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{padding:"5px 12px",borderRadius:6,fontSize:11,background:C.surfaceAlt,color:C.tm,border:`0.5px solid ${C.border}`,cursor:"pointer"}}>{theme==="dark"?"☀ Claro":"◑ Oscuro"}</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,padding:"0 20px",borderBottom:`0.5px solid ${C.border}`,overflowX:"auto"}}>
        {TABS.map((t,i)=>{
          const esAlertas=t==="Alertas";
          return(
            <button key={t} onClick={()=>setTab(i)} style={{
              padding:"12px 16px",fontSize:13,fontWeight:tab===i?600:400,
              color:tab===i?C.accent:C.tm,background:"none",border:"none",
              borderBottom:tab===i?`2px solid ${C.accent}`:"2px solid transparent",
              cursor:"pointer",whiteSpace:"nowrap",position:"relative"
            }}>
              {t}
              {esAlertas&&nAlertas>0&&(
                <span style={{position:"absolute",top:8,right:2,background:C.red,color:"#fff",borderRadius:10,fontSize:9,fontWeight:700,padding:"1px 5px",lineHeight:1.4}}>{nAlertas}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      <div style={{padding:"16px 20px",maxWidth:960,margin:"0 auto"}}>
        {error&&<div style={{padding:12,borderRadius:8,background:C.redD,color:C.red,fontSize:13,marginBottom:12}}>Error cargando datos: {error}</div>}
        {loading?<Loading C={C}/>:data?(
          <>
            {tab===0&&<TabResumen C={C} bancos={data.bancos} dap={data.dap} cal={data.calendario} ffmm={data.ffmmSaldos} leasingDetalle={data.leasingDetalle} leasingResumen={data.leasingResumen} creditoPendiente={data.creditoPendiente} saldoInsoluto={data.saldoInsolutoActual} alertas={alertasData}/>}
            {tab===1&&<TabBancos C={C} bancos={data.bancos}/>}
            {tab===2&&<TabCalendario C={C} cal={data.calendario}/>}
            {tab===3&&<TabFlujoCaja C={C} ventas={data.ventas} calendario={data.calendario} leasingDetalle={data.leasingDetalle} creditoPendiente={data.creditoPendiente}/>}
            {tab===4&&<TabInversiones C={C} dap={data.dap}/>}
            {tab===5&&<TabFFMM C={C} ffmm={data.ffmmSaldos} movimientos={data.ffmmMovimientos}/>}
            {tab===6&&<TabLeasing C={C} leasingDetalle={data.leasingDetalle} leasingResumen={data.leasingResumen}/>}
            {tab===7&&<TabCredito C={C} credito={data.credito} creditoPendiente={data.creditoPendiente} saldoInsoluto={data.saldoInsolutoActual}/>}
            {tab===8&&<TabAlertas C={C} alertas={alertasData}/>}
            {tab===9&&<TabCalc C={C}/>}
          </>
        ):<div style={{padding:40,textAlign:"center",color:C.td}}>No se pudieron cargar los datos</div>}
      </div>
    </div>
  );
}
