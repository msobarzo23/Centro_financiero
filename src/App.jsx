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

const TABS=["Resumen","Bancos","Calendario","Inversiones","Fondos Mutuos","Leasing","Crédito","Calculadora"];

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

// ─── Banco color leasing ──────────────────────────────────────────────────────
function colorBanco(banco,C){
  const b=(banco||'').toUpperCase();
  if(b.includes('BCI'))   return{bg:C.accentD,color:C.accent};
  if(b.includes('VOLVO')||b.includes('VFS')) return{bg:C.amberD,color:C.amber};
  if(b.includes('CHILE')) return{bg:C.tealD,color:C.teal};
  return{bg:C.purpleD,color:C.purple};
}

// ─── TAB RESUMEN ─────────────────────────────────────────────────────────────
function TabResumen({C,bancos,dap,cal,ffmm,leasingDetalle,leasingResumen,creditoPendiente,saldoInsoluto}){
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

  // ── Leasing en Resumen ───────────────────────────────────────────────────
  const totalDeudaLeasingUF=leasingDetalle.reduce((s,d)=>s+d.deudaUF,0);
  const nContratosLeasing=leasingDetalle.length;
  // Cuotas calculadas desde leasingDetalle agrupando por día de vencimiento
  const cuotaDia5 =leasingDetalle.filter(d=>d.diaVto===5 ||d.diaVto===4 ).reduce((s,d)=>s+d.cuotaCLPcIVA,0);
  const cuotaDia15=leasingDetalle.filter(d=>d.diaVto===15||d.diaVto===14).reduce((s,d)=>s+d.cuotaCLPcIVA,0);
  const cuotaTotalLeasing=leasingDetalle.reduce((s,d)=>s+d.cuotaCLPcIVA,0);
  // Deuda leasing s/IVA = flujo real de caja: cuota mensual s/IVA × cuotas que quedan
  const deudaLeasingSIVACLP=leasingDetalle.reduce((s,d)=>s+(d.cuotaCLPsIVA*d.cuotasPorPagar),0);

  // Crédito comercial
  const cuotasCreditoPend=creditoPendiente.length;
  // Próxima cuota con pago real (valorCuota > 0, ignorar meses de gracia)
  const proximaCuotaCredito=creditoPendiente.find(c=>c.valorCuota>0)||creditoPendiente[0]||null;

  const noData=bancosHoy.length===0;
  const mesLabel=new Date(hoy+"T12:00:00").toLocaleDateString("es-CL",{month:"long"});

  return(<div>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,padding:"8px 12px",borderRadius:8,background:noData?C.amberD:semCubierta?C.greenD:C.amberD,border:`0.5px solid ${noData?C.amber+"44":semCubierta?C.green+"44":C.amber+"44"}`}}>
      <span style={{fontSize:14}}>{noData?"○":semCubierta?"●":"◐"}</span>
      <span style={{fontSize:13,color:noData?C.amberT:semCubierta?C.greenT:C.amberT,fontWeight:500}}>
        {noData?"Sin movimientos bancarios hoy — ingresa los saldos en la hoja Bancos":semCubierta?"Semana cubierta — compromisos al día":`Faltan ${f(faltaSem)} para cubrir la semana`}
      </span>
    </div>

    {/* ── Métricas principales ── */}
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
      <Metric C={C} label="Saldo cuentas hoy" value={saldoAct>0?f(saldoAct):"Sin datos"} sub={totalIni>0?`Inicial: ${f(totalIni)}`:undefined}/>
      <Metric C={C} label="En DAP vigentes" value={f(totalDAP)} sub={`${trab.length} trabajo · ${inv.length} inversión · ${cred.length} crédito`} color={C.amber}/>
      <Metric C={C} label="Fondos mutuos" value={totalFFMMAct>0?f(totalFFMMAct):f(totalFFMMInv)} sub={totalGanFFMM>0?`Rent: +${fS(totalGanFFMM)}`:undefined} color={C.purple}/>
      <Metric C={C} label={`${mesLabel} cubierto`} value={`${Math.round(pctMes*100)}%`} sub={`${f(guarMes)} de ${f(compMes)}`} color={pctMes>=.9?C.green:C.amber}/>
    </div>

    {/* ── Leasing + Crédito + Deuda total ── */}
    {nContratosLeasing>0&&<div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>

      {/* Cuadro leasing */}
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

      {/* Cuadro crédito */}
      {saldoInsoluto>0&&<div style={{background:C.surface,borderRadius:10,padding:"14px 16px",border:`0.5px solid ${C.border}`,flex:1,minWidth:160}}>
        <div style={{fontSize:11,color:C.tm,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>Crédito comercial</div>
        <div style={{fontSize:20,fontWeight:700,color:C.red,fontFamily:"monospace"}}>{f(saldoInsoluto)}</div>
        <div style={{fontSize:11,color:C.td,marginTop:4}}>{cuotasCreditoPend} cuotas · capital+intereses</div>
        {proximaCuotaCredito&&<div style={{fontSize:11,color:C.td}}>Próxima: {fd(proximaCuotaCredito.fechaVenc)} · {f(proximaCuotaCredito.valorCuota)}</div>}
      </div>}

      {/* Cuadro deuda total neta */}
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

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      {/* Próximos compromisos */}
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
      {/* DAPs próximos a vencer */}
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

// ─── TAB LEASING (NUEVO) ──────────────────────────────────────────────────────
function TabLeasing({C,leasingDetalle,leasingResumen}){
  const hoy=getToday();

  // ── Métricas resumen ──────────────────────────────────────────────────────
  const totalDeudaUF=leasingDetalle.reduce((s,d)=>s+d.deudaUF,0);
  const totalCuotaCLP=leasingDetalle.reduce((s,d)=>s+d.cuotaCLPcIVA,0);
  const totalTractos=leasingDetalle.reduce((s,d)=>s+d.nTractos,0);
  const totalCuotasPorPagar=leasingDetalle.reduce((s,d)=>s+d.cuotasPorPagar,0);

  // Deuda por emisor
  const porBanco={};
  leasingDetalle.forEach(d=>{
    const b=d.banco;
    if(!porBanco[b])porBanco[b]={deudaUF:0,cuota:0,contratos:0};
    porBanco[b].deudaUF+=d.deudaUF;
    porBanco[b].cuota+=d.cuotaCLPcIVA;
    porBanco[b].contratos+=1;
  });

  // Próximas cuotas con estado URGENTE
  const proximas=leasingResumen.slice(0,3);

  return(<div>
    {/* ── Métricas superiores ── */}
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
      <Metric C={C} label="Deuda total (UF)" value={fUF(totalDeudaUF)} sub={`${leasingDetalle.length} contratos activos`} color={C.teal}/>
      <Metric C={C} label="Tractos en leasing" value={totalTractos} sub="Unidades comprometidas" color={C.teal}/>
      <Metric C={C} label="Cuota mensual total" value={f(totalCuotaCLP)} sub="Con IVA · todos los bancos" color={C.amber}/>
      <Metric C={C} label="Cuotas por pagar" value={totalCuotasPorPagar} sub="Suma contratos activos" color={C.td}/>
    </div>

    {/* ── Próximas cuotas ── */}
    {proximas.length>0&&<div style={{background:C.surface,borderRadius:10,padding:16,border:`0.5px solid ${C.border}`,marginBottom:14}}>
      <div style={{fontSize:12,color:C.tm,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.5px"}}>Próximas cuotas a pagar</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
        {proximas.map((r,i)=>{
          const bciTotal=(r.bciDia5||0)+(r.bciDia15||0);
          // Determinar si hay urgencia (primer mes = más próximo)
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

    {/* ── Resumen por emisor ── */}
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

    {/* ── Tabla contratos activos ── */}
    <div style={{background:C.surface,borderRadius:10,border:`0.5px solid ${C.border}`,overflow:"hidden",marginBottom:14}}>
      <div style={{padding:"12px 14px",borderBottom:`0.5px solid ${C.borderL}`,fontSize:12,color:C.tm,textTransform:"uppercase"}}>
        Contratos activos ({leasingDetalle.length})
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr>{["Banco","Tractos","Cuota c/IVA","Cuotas x Pagar","Vencimiento","Deuda UF"].map(h=>(
              <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:C.td,fontWeight:500,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {leasingDetalle.length===0
              ?<tr><td colSpan={6} style={{padding:20,textAlign:"center",color:C.td}}>Sin contratos activos</td></tr>
              :leasingDetalle.map((d,i)=>{
                const tc=colorBanco(d.banco,C);
                // Alerta si vence pronto (fecha fin cercana)
                const diasFin=d.fechaFin?dd(hoy,d.fechaFin):9999;
                const venceProx=diasFin<=60&&diasFin>=0;
                return(
                  <tr key={i} style={{borderTop:`0.5px solid ${C.border}`,background:i%2===0?"transparent":C.surfaceAlt+"55"}}>
                    <td style={{padding:"8px 12px"}}>
                      <span style={{padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:500,background:tc.bg,color:tc.color}}>{d.banco}</span>
                    </td>
                    <td style={{padding:"8px 12px",color:C.text,fontWeight:500,textAlign:"center"}}>{d.nTractos}</td>
                    <td style={{padding:"8px 12px",fontFamily:"monospace",color:C.text,fontWeight:600}}>{fS(d.cuotaCLPcIVA)}</td>
                    <td style={{padding:"8px 12px",color:C.text,textAlign:"center"}}>{d.cuotasPorPagar}</td>
                    <td style={{padding:"8px 12px",color:venceProx?C.amber:C.text,fontWeight:venceProx?600:400,whiteSpace:"nowrap"}}>
                      {fd(d.fechaFin)}{venceProx?` (${diasFin}d)`:""}
                    </td>
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

    {/* ── Proyección mensual ── */}
    {leasingResumen.length>0&&<div style={{background:C.surface,borderRadius:10,border:`0.5px solid ${C.border}`,overflow:"hidden"}}>
      <div style={{padding:"12px 14px",borderBottom:`0.5px solid ${C.borderL}`,fontSize:12,color:C.tm,textTransform:"uppercase"}}>
        Proyección mensual de cuotas
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr>{["Mes","Cuota c/IVA","BCI","VFS Volvo","Banco Chile","Contratos","Vence"].map(h=>(
              <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:C.td,fontWeight:500,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
            ))}</tr>
          </thead>
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


// ─── TAB CRÉDITO (NUEVO) ──────────────────────────────────────────────────────
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
    {/* ── Métricas ── */}
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
      <Metric C={C} label="Total a pagar" value={f(saldoInsoluto)} sub="Capital + intereses futuros" color={C.red}/>
      <Metric C={C} label="Cuotas pendientes" value={creditoPendiente.length} sub={`de ${totalCuotas} totales · pagadas: ${pagadas}`} color={C.amber}/>
      <Metric C={C} label="Cuota mensual" value={f(cuotaMensual)} sub="Capital + interés" color={C.text}/>
      <Metric C={C} label="Intereses pendientes" value={f(interesesPend)} sub={`Total histórico: ${f(totalIntereses)}`} color={C.td}/>
    </div>

    {/* ── Próximas cuotas ── */}
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

    {/* ── Tabla completa ── */}
    <div style={{background:C.surface,borderRadius:10,border:`0.5px solid ${C.border}`,overflow:"hidden"}}>
      <div style={{padding:"12px 14px",borderBottom:`0.5px solid ${C.borderL}`,fontSize:12,color:C.tm,textTransform:"uppercase"}}>
        Tabla de amortización · {totalCuotas} cuotas
      </div>
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
      <div style={{fontSize:11,color:C.td,marginBottom:12}}>Soporta +, -, *, / entre valores · "M" = millones · "MM" = miles de millones · Ej: 500M+300M, 1.5MM*2, 800M-150M</div>
      {lines.map((l,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <input type="text" value={l} onChange={e=>upd(i,e.target.value)} onKeyDown={e=>{if(e.key==="Enter")add();}} placeholder={i===0?"Ej: 500M+300M, 1.5MM*2, 800M/4":""}  style={{flex:1,padding:"8px 12px",borderRadius:6,fontSize:15,background:C.surfaceAlt,color:C.text,border:`0.5px solid ${C.border}`,fontFamily:"monospace",outline:"none"}}/>
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
      <div style={{display:"flex",gap:0,padding:"0 20px",borderBottom:`0.5px solid ${C.border}`,overflowX:"auto"}}>
        {TABS.map((t,i)=>(<button key={t} onClick={()=>setTab(i)} style={{padding:"12px 16px",fontSize:13,fontWeight:tab===i?600:400,color:tab===i?C.accent:C.tm,background:"none",border:"none",borderBottom:tab===i?`2px solid ${C.accent}`:"2px solid transparent",cursor:"pointer",whiteSpace:"nowrap"}}>{t}</button>))}
      </div>
      <div style={{padding:"16px 20px",maxWidth:960,margin:"0 auto"}}>
        {error&&<div style={{padding:12,borderRadius:8,background:C.redD,color:C.red,fontSize:13,marginBottom:12}}>Error cargando datos: {error}</div>}
        {loading?<Loading C={C}/>:data?(
          <>
            {tab===0&&<TabResumen C={C} bancos={data.bancos} dap={data.dap} cal={data.calendario} ffmm={data.ffmmSaldos} leasingDetalle={data.leasingDetalle} leasingResumen={data.leasingResumen} creditoPendiente={data.creditoPendiente} saldoInsoluto={data.saldoInsolutoActual}/>}
            {tab===1&&<TabBancos C={C} bancos={data.bancos}/>}
            {tab===2&&<TabCalendario C={C} cal={data.calendario}/>}
            {tab===3&&<TabInversiones C={C} dap={data.dap}/>}
            {tab===4&&<TabFFMM C={C} ffmm={data.ffmmSaldos} movimientos={data.ffmmMovimientos}/>}
            {tab===5&&<TabLeasing C={C} leasingDetalle={data.leasingDetalle} leasingResumen={data.leasingResumen}/>}
            {tab===6&&<TabCredito C={C} credito={data.credito} creditoPendiente={data.creditoPendiente} saldoInsoluto={data.saldoInsolutoActual}/>}
            {tab===7&&<TabCalc C={C}/>}
          </>
        ):<div style={{padding:40,textAlign:"center",color:C.td}}>No se pudieron cargar los datos</div>}
      </div>
    </div>
  );
}
