import { useState, useEffect } from "react";

// ─── STORAGE ─────────────────────────────────────────────────────────────────
const KEYS = { clients:"sg_clients2", inventory:"sg_inventory2", deliveries:"sg_deliveries2", reviews:"sg_reviews2", payments:"sg_payments2" };
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// ─── UTILS ───────────────────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const today = () => new Date().toISOString().slice(0,10);
const fmt = n => `$${Number(n||0).toLocaleString("es-MX",{minimumFractionDigits:2})}`;
const fmtN = n => Number(n||0).toLocaleString("es-MX");

// ─── CALC ENGINE ─────────────────────────────────────────────────────────────
function calcMetrics(inventory, deliveries, reviews, payments) {
  const totalFab = inventory.reduce((s,e)=>s+e.quantity,0);
  const totalDelivered = deliveries.reduce((s,d)=>s+d.quantityDelivered,0);
  const totalSold = reviews.reduce((s,r)=>s+r.piecesSold,0);
  const totalRetGood = reviews.reduce((s,r)=>s+r.piecesReturnedGood,0);
  const totalDamaged = reviews.reduce((s,r)=>s+r.piecesDamaged,0);
  const stockAlmacen = totalFab - totalDelivered + totalRetGood;
  const stockClientes = totalDelivered - totalSold - totalRetGood - totalDamaged;
  const importeVendido = reviews.reduce((s,r)=>s+r.soldAmount,0);
  const totalAbonado = payments.reduce((s,p)=>s+p.amount,0);
  const saldoPendiente = importeVendido - totalAbonado;
  const cxcPotencial = deliveries.reduce((s,d)=>{
    const revD = reviews.filter(r=>r.clientId===d.clientId&&r.lot===d.lot);
    const v = revD.reduce((a,r)=>a+r.piecesSold,0);
    const dev = revD.reduce((a,r)=>a+r.piecesReturnedGood,0);
    const dan = revD.reduce((a,r)=>a+r.piecesDamaged,0);
    const enCalle = d.quantityDelivered - v - dev - dan;
    return s + (enCalle>0 ? enCalle*d.agreedUnitPrice : 0);
  },0);
  return { totalFab, totalDelivered, totalSold, totalRetGood, totalDamaged, stockAlmacen, stockClientes, importeVendido, totalAbonado, saldoPendiente, cxcPotencial };
}

function clientMetrics(clientId, deliveries, reviews, payments) {
  const dels = deliveries.filter(d=>d.clientId===clientId);
  const revs = reviews.filter(r=>r.clientId===clientId);
  const pays = payments.filter(p=>p.clientId===clientId);
  const piezasEntregadas = dels.reduce((s,d)=>s+d.quantityDelivered,0);
  const piezasVendidas = revs.reduce((s,r)=>s+r.piecesSold,0);
  const piezasDevueltas = revs.reduce((s,r)=>s+r.piecesReturnedGood,0);
  const piezasDañadas = revs.reduce((s,r)=>s+r.piecesDamaged,0);
  const enConsignacion = piezasEntregadas - piezasVendidas - piezasDevueltas - piezasDañadas;
  const totalVendido = revs.reduce((s,r)=>s+r.soldAmount,0);
  const totalAbonado = pays.reduce((s,p)=>s+p.amount,0);
  const saldo = totalVendido - totalAbonado;
  const cxcPotencial = dels.reduce((s,d)=>{
    const revD = revs.filter(r=>r.lot===d.lot);
    const v = revD.reduce((a,r)=>a+r.piecesSold,0);
    const dev = revD.reduce((a,r)=>a+r.piecesReturnedGood,0);
    const dan = revD.reduce((a,r)=>a+r.piecesDamaged,0);
    const enCalle = d.quantityDelivered - v - dev - dan;
    return s + (enCalle>0 ? enCalle*d.agreedUnitPrice : 0);
  },0);
  const ultimaRevision = revs.length ? revs[revs.length-1].date : null;
  const proximaRevision = dels.length ? dels[dels.length-1].nextReviewDate : null;
  return { piezasEntregadas, piezasVendidas, piezasDevueltas, piezasDañadas, enConsignacion, totalVendido, totalAbonado, saldo, cxcPotencial, ultimaRevision, proximaRevision };
}

// ─── UI ATOMS ────────────────────────────────────────────────────────────────
const Card = ({label,value,sub,color="#16a34a"}) => (
  <div style={{background:"#fff",borderRadius:12,padding:"14px 16px",boxShadow:"0 1px 4px #0001",borderLeft:`4px solid ${color}`}}>
    <div style={{fontSize:11,color:"#6b7280",marginBottom:2}}>{label}</div>
    <div style={{fontSize:21,fontWeight:700,color}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:"#9ca3af"}}>{sub}</div>}
  </div>
);

const Btn = ({children,onClick,color="#16a34a",sm,full,style={}}) => (
  <button onClick={onClick} style={{background:color,color:"#fff",border:"none",borderRadius:8,padding:sm?"6px 11px":"10px 18px",fontWeight:600,fontSize:sm?12:14,cursor:"pointer",width:full?"100%":"auto",...style}}>{children}</button>
);

const BtnOut = ({children,onClick,color="#16a34a",sm}) => (
  <button onClick={onClick} style={{background:"transparent",color,border:`1.5px solid ${color}`,borderRadius:8,padding:sm?"5px 10px":"9px 16px",fontWeight:600,fontSize:sm?12:14,cursor:"pointer"}}>{children}</button>
);

const Inp = ({label,...p}) => (
  <div style={{marginBottom:12}}>
    {label&&<label style={{fontSize:12,color:"#374151",display:"block",marginBottom:4,fontWeight:600}}>{label}</label>}
    <input style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #d1fae5",borderRadius:8,padding:"9px 12px",fontSize:14,background:"#f9fafb",color:"#111827"}} {...p}/>
  </div>
);

const Sel = ({label,children,...p}) => (
  <div style={{marginBottom:12}}>
    {label&&<label style={{fontSize:12,color:"#374151",display:"block",marginBottom:4,fontWeight:600}}>{label}</label>}
    <select style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #d1fae5",borderRadius:8,padding:"9px 12px",fontSize:14,background:"#f9fafb",color:"#111827"}} {...p}>{children}</select>
  </div>
);

const TA = ({label,...p}) => (
  <div style={{marginBottom:12}}>
    {label&&<label style={{fontSize:12,color:"#374151",display:"block",marginBottom:4,fontWeight:600}}>{label}</label>}
    <textarea style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #d1fae5",borderRadius:8,padding:"9px 12px",fontSize:14,background:"#f9fafb",color:"#111827",minHeight:56}} {...p}/>
  </div>
);

const Alrt = ({msg,type="error"}) => msg?(
  <div style={{background:type==="ok"?"#f0fdf4":"#fef2f2",border:`1px solid ${type==="ok"?"#86efac":"#fca5a5"}`,borderRadius:8,padding:"9px 13px",marginBottom:10,fontSize:13,color:type==="ok"?"#16a34a":"#dc2626"}}>{msg}</div>
):null;

const InfoBox = ({children,color="#f0fdf4"}) => (
  <div style={{background:color,borderRadius:8,padding:"9px 13px",marginBottom:12,fontSize:13}}>{children}</div>
);

const SectionLabel = ({children}) => (
  <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,marginBottom:6,marginTop:14}}>{children}</div>
);

const Modal = ({title,children,onClose}) => (
  <div style={{position:"fixed",inset:0,background:"#0007",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:16,overflowY:"auto"}}>
    <div style={{background:"#fff",borderRadius:14,padding:20,width:"100%",maxWidth:480,margin:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:16,color:"#15803d"}}>{title}</div>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#6b7280",lineHeight:1}}>×</button>
      </div>
      {children}
    </div>
  </div>
);

const Tbl = ({cols,rows,empty="Sin registros."}) => (
  <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
      <thead><tr>{cols.map((c,i)=><th key={i} style={{textAlign:"left",padding:"8px 8px",background:"#f0fdf4",color:"#15803d",fontWeight:700,borderBottom:"2px solid #bbf7d0",whiteSpace:"nowrap"}}>{c}</th>)}</tr></thead>
      <tbody>{rows.length===0?<tr><td colSpan={cols.length} style={{padding:16,color:"#9ca3af",textAlign:"center"}}>{empty}</td></tr>:rows.map((r,i)=><tr key={i} style={{background:i%2?"#f9fafb":"#fff"}}>{r.map((c,j)=><td key={j} style={{padding:"7px 8px",borderBottom:"1px solid #f3f4f6",verticalAlign:"middle"}}>{c}</td>)}</tr>)}</tbody>
    </table>
  </div>
);

const DelBtn = ({onClick}) => (
  <button onClick={onClick} style={{background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer",fontWeight:600}}>✕</button>
);
const EditBtn = ({onClick}) => (
  <button onClick={onClick} style={{background:"#f0fdf4",color:"#15803d",border:"1px solid #86efac",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer",fontWeight:600}}>✎</button>
);

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [clients, setClients] = useState(()=>load(KEYS.clients,[]));
  const [inventory, setInventory] = useState(()=>load(KEYS.inventory,[]));
  const [deliveries, setDeliveries] = useState(()=>load(KEYS.deliveries,[]));
  const [reviews, setReviews] = useState(()=>load(KEYS.reviews,[]));
  const [payments, setPayments] = useState(()=>load(KEYS.payments,[]));

  useEffect(()=>save(KEYS.clients,clients),[clients]);
  useEffect(()=>save(KEYS.inventory,inventory),[inventory]);
  useEffect(()=>save(KEYS.deliveries,deliveries),[deliveries]);
  useEffect(()=>save(KEYS.reviews,reviews),[reviews]);
  useEffect(()=>save(KEYS.payments,payments),[payments]);

  const metrics = calcMetrics(inventory,deliveries,reviews,payments);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({clients,inventory,deliveries,reviews,payments},null,2)],{type:"application/json"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="salsa-ganso.json"; a.click();
  };
  const clearAll = () => { if(window.confirm("¿Borrar TODOS los datos? No se puede deshacer.")) { setClients([]); setInventory([]); setDeliveries([]); setReviews([]); setPayments([]); }};

  const nav = [["dashboard","📊 Dashboard"],["clientes","👥 Clientes"],["inventario","📦 Inventario"],["entregas","🚚 Entregas"],["revisiones","🔍 Revisiones"],["pagos","💳 Pagos"],["reportes","📋 Reportes"],["historial","🗂 Historial"]];

  return (
    <div style={{fontFamily:"'Segoe UI',sans-serif",background:"#f0fdf4",minHeight:"100vh"}}>
      <div style={{background:"#15803d",color:"#fff",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <div>
          <div style={{fontWeight:800,fontSize:16}}>🫙 Control Salsa Ganso</div>
          <div style={{fontSize:10,opacity:.8}}>Salsa Ganso 250ml · SG-250</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <Btn onClick={exportData} color="#166534" sm>⬇ Export</Btn>
          <Btn onClick={clearAll} color="#dc2626" sm>🗑 Limpiar</Btn>
        </div>
      </div>

      <div style={{background:"#fff",overflowX:"auto",display:"flex",borderBottom:"2px solid #d1fae5"}}>
        {nav.map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{whiteSpace:"nowrap",padding:"10px 13px",border:"none",background:tab===k?"#f0fdf4":"transparent",color:tab===k?"#15803d":"#6b7280",fontWeight:tab===k?700:400,fontSize:12,borderBottom:tab===k?"2px solid #16a34a":"2px solid transparent",cursor:"pointer"}}>{l}</button>
        ))}
      </div>

      <div style={{padding:16,maxWidth:720,margin:"0 auto"}}>
        {tab==="dashboard"  && <Dashboard metrics={metrics} clients={clients} deliveries={deliveries} reviews={reviews} payments={payments}/>}
        {tab==="clientes"   && <Clientes clients={clients} setClients={setClients} deliveries={deliveries} reviews={reviews} payments={payments}/>}
        {tab==="inventario" && <Inventario inventory={inventory} setInventory={setInventory} metrics={metrics}/>}
        {tab==="entregas"   && <Entregas clients={clients} deliveries={deliveries} setDeliveries={setDeliveries} metrics={metrics}/>}
        {tab==="revisiones" && <Revisiones clients={clients} deliveries={deliveries} reviews={reviews} setReviews={setReviews} payments={payments} setPayments={setPayments}/>}
        {tab==="pagos"      && <Pagos clients={clients} deliveries={deliveries} reviews={reviews} payments={payments} setPayments={setPayments}/>}
        {tab==="reportes"   && <Reportes clients={clients} inventory={inventory} deliveries={deliveries} reviews={reviews} payments={payments} metrics={metrics}/>}
        {tab==="historial"  && <Historial clients={clients} deliveries={deliveries} reviews={reviews} payments={payments}/>}
      </div>
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({metrics,clients,deliveries,reviews,payments}) {
  const {totalFab,stockAlmacen,totalDelivered,stockClientes,totalSold,totalRetGood,totalDamaged,importeVendido,totalAbonado,saldoPendiente,cxcPotencial} = metrics;
  const activeClients = clients.filter(c=>c.status==="Activo").length;
  const clientsWithBalance = clients.filter(c=>clientMetrics(c.id,deliveries,reviews,payments).saldo>0).length;
  return (
    <div>
      <h2 style={{color:"#15803d",marginTop:0}}>Dashboard</h2>
      <SectionLabel>INVENTARIO</SectionLabel>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4}}>
        <Card label="Total fabricado" value={fmtN(totalFab)} sub="piezas"/>
        <Card label="En almacén" value={fmtN(stockAlmacen)} sub="disponible" color="#2563eb"/>
        <Card label="Entregado consignación" value={fmtN(totalDelivered)} sub="histórico" color="#7c3aed"/>
        <Card label="En poder de clientes" value={fmtN(stockClientes)} sub="activo" color="#d97706"/>
        <Card label="Piezas vendidas" value={fmtN(totalSold)}/>
        <Card label="Devueltas buenas" value={fmtN(totalRetGood)} color="#0891b2"/>
        <Card label="Dañadas/perdidas" value={fmtN(totalDamaged)} color="#dc2626"/>
      </div>
      <SectionLabel>FINANCIERO</SectionLabel>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4}}>
        <Card label="Importe vendido" value={fmt(importeVendido)}/>
        <Card label="Total abonado" value={fmt(totalAbonado)} color="#2563eb"/>
        <Card label="Saldo pendiente" value={fmt(saldoPendiente)} sub="vendido no cobrado" color={saldoPendiente>0?"#dc2626":"#16a34a"}/>
        <Card label="CxC potencial" value={fmt(cxcPotencial)} sub="piezas en calle × precio" color="#d97706"/>
      </div>
      <SectionLabel>CLIENTES</SectionLabel>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Card label="Clientes activos" value={activeClients}/>
        <Card label="Con saldo pendiente" value={clientsWithBalance} color={clientsWithBalance>0?"#dc2626":"#16a34a"}/>
      </div>
    </div>
  );
}

// ─── CLIENTES ────────────────────────────────────────────────────────────────
function Clientes({clients,setClients,deliveries,reviews,payments}) {
  const [modal,setModal] = useState(null);
  const [form,setForm] = useState({});
  const [err,setErr] = useState(""); const [ok,setOk] = useState("");
  const [search,setSearch] = useState("");
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const openNew = () => { setForm({status:"Activo",createdAt:today()}); setErr(""); setOk(""); setModal("form"); };
  const openEdit = c => { setForm({...c}); setErr(""); setOk(""); setModal("form"); };

  const saveClient = () => {
    if(!form.businessName?.trim()) return setErr("El nombre del negocio es obligatorio.");
    const dup = clients.find(c=>c.businessName.trim().toLowerCase()===form.businessName.trim().toLowerCase()&&c.id!==form.id);
    if(dup) return setErr("Ya existe un cliente con ese nombre.");
    if(form.id) { setClients(p=>p.map(c=>c.id===form.id?{...form,businessName:form.businessName.trim()}:c)); }
    else { setClients(p=>[...p,{...form,id:uid(),createdAt:today(),businessName:form.businessName.trim()}]); }
    setOk("Guardado."); setErr(""); setTimeout(()=>{setModal(null);setOk("");},800);
  };

  const delClient = c => {
    const hasData = deliveries.some(d=>d.clientId===c.id)||reviews.some(r=>r.clientId===c.id)||payments.some(p=>p.clientId===c.id);
    if(hasData) return alert("No se puede eliminar: el cliente tiene movimientos registrados. Puedes cambiar su estatus a Inactivo.");
    if(window.confirm(`¿Eliminar a "${c.businessName}"?`)) setClients(p=>p.filter(x=>x.id!==c.id));
  };

  const filtered = clients.filter(c=>c.businessName.toLowerCase().includes(search.toLowerCase())||c.responsibleName?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <h2 style={{color:"#15803d",margin:0}}>Clientes</h2>
        <Btn onClick={openNew}>+ Nuevo</Btn>
      </div>
      <Inp placeholder="Buscar cliente…" value={search} onChange={e=>setSearch(e.target.value)}/>
      {filtered.length===0&&<div style={{color:"#9ca3af",textAlign:"center",padding:24}}>Sin clientes.</div>}
      {filtered.map(c=>{
        const m = clientMetrics(c.id,deliveries,reviews,payments);
        const stColor = c.status==="Activo"?"#16a34a":c.status==="Pausado"?"#d97706":"#9ca3af";
        return (
          <div key={c.id} style={{background:"#fff",borderRadius:12,padding:14,marginBottom:10,boxShadow:"0 1px 4px #0001",borderLeft:`4px solid ${stColor}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontWeight:700}}>{c.businessName}</div>
                <div style={{fontSize:12,color:"#6b7280"}}>{c.responsibleName} · {c.whatsapp}</div>
              </div>
              <span style={{fontSize:11,background:c.status==="Activo"?"#d1fae5":"#fef3c7",color:c.status==="Activo"?"#15803d":"#92400e",borderRadius:6,padding:"2px 8px"}}>{c.status}</span>
            </div>
            <div style={{display:"flex",gap:16,marginTop:8,fontSize:12}}>
              <span>📦 {m.enConsignacion} pzas en consig.</span>
              <span style={{color:m.saldo>0?"#dc2626":"#16a34a"}}>💰 Saldo {fmt(m.saldo)}</span>
            </div>
            {m.cxcPotencial>0&&<div style={{fontSize:12,color:"#d97706",marginTop:2}}>📈 CxC potencial {fmt(m.cxcPotencial)}</div>}
            <div style={{marginTop:10,display:"flex",gap:8}}>
              <EditBtn onClick={()=>openEdit(c)}/>
              <DelBtn onClick={()=>delClient(c)}/>
            </div>
          </div>
        );
      })}

      {modal==="form"&&(
        <Modal title={form.id?"Editar cliente":"Nuevo cliente"} onClose={()=>setModal(null)}>
          <Alrt msg={err}/><Alrt msg={ok} type="ok"/>
          <Inp label="Nombre del negocio *" value={form.businessName||""} onChange={f("businessName")}/>
          <Inp label="Responsable" value={form.responsibleName||""} onChange={f("responsibleName")}/>
          <Inp label="WhatsApp" value={form.whatsapp||""} onChange={f("whatsapp")} type="tel"/>
          <Inp label="Correo" value={form.email||""} onChange={f("email")} type="email"/>
          <Inp label="Dirección" value={form.address||""} onChange={f("address")}/>
          <Sel label="Estatus" value={form.status||"Activo"} onChange={f("status")}>
            <option>Activo</option><option>Pausado</option><option>Inactivo</option>
          </Sel>
          <TA label="Observaciones" value={form.notes||""} onChange={f("notes")}/>
          <Btn onClick={saveClient} full>Guardar</Btn>
        </Modal>
      )}
    </div>
  );
}

// ─── INVENTARIO ──────────────────────────────────────────────────────────────
function Inventario({inventory,setInventory,metrics}) {
  const [modal,setModal] = useState(false);
  const [form,setForm] = useState({});
  const [editId,setEditId] = useState(null);
  const [err,setErr] = useState(""); const [ok,setOk] = useState("");
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const nextLot = () => {
    const nums = inventory.map(e=>{const m=e.lot?.match(/L(\d+)$/);return m?parseInt(m[1]):0;});
    return `SG-250-L${String((nums.length?Math.max(...nums):0)+1).padStart(3,"0")}`;
  };

  const openNew = () => { setForm({date:today(),lot:nextLot(),unitCost:"",quantity:"",notes:""}); setEditId(null); setErr(""); setOk(""); setModal(true); };
  const openEdit = e => { setForm({...e}); setEditId(e.id); setErr(""); setOk(""); setModal(true); };
  const delEntry = e => { if(window.confirm("¿Eliminar esta entrada de inventario?")) setInventory(p=>p.filter(x=>x.id!==e.id)); };

  const qty = parseFloat(form.quantity)||0;
  const cost = parseFloat(form.unitCost)||0;
  const totalCost = qty*cost;

  const save_ = () => {
    if(qty<=0) return setErr("La cantidad debe ser mayor a cero.");
    if(!form.lot?.trim()) return setErr("El lote es obligatorio.");
    const entry = {id:editId||uid(),date:form.date,lot:form.lot.trim(),quantity:qty,unitCost:cost,totalCost,notes:form.notes};
    if(editId) setInventory(p=>p.map(x=>x.id===editId?entry:x));
    else setInventory(p=>[...p,entry]);
    setOk("Guardado."); setErr(""); setTimeout(()=>{setModal(false);setOk("");},800);
  };

  const avgCost = inventory.length ? inventory.reduce((s,e)=>s+e.totalCost,0)/inventory.reduce((s,e)=>s+e.quantity,0) : 0;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <h2 style={{color:"#15803d",margin:0}}>Inventario</h2>
        <Btn onClick={openNew}>+ Entrada</Btn>
      </div>
      <div style={{background:"#fff",borderRadius:12,padding:16,marginBottom:16}}>
        <div style={{fontWeight:700,color:"#15803d",marginBottom:10}}>Salsa Ganso 250ml · SG-250</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:13}}>
          {[["Total fabricado",fmtN(metrics.totalFab)+" pzas"],["En almacén",fmtN(metrics.stockAlmacen)+" pzas"],["Entregado",fmtN(metrics.totalDelivered)+" pzas"],["En clientes",fmtN(metrics.stockClientes)+" pzas"],["Vendidas",fmtN(metrics.totalSold)+" pzas"],["Devueltas",fmtN(metrics.totalRetGood)+" pzas"],["Dañadas",fmtN(metrics.totalDamaged)+" pzas"],["Costo promedio",fmt(avgCost)],["Costo total acum.",fmt(inventory.reduce((s,e)=>s+e.totalCost,0))]].map(([l,v])=>(
            <div key={l}><span style={{color:"#6b7280"}}>{l}: </span><strong>{v}</strong></div>
          ))}
        </div>
      </div>
      <Tbl
        cols={["Fecha","Lote","Cant.","Costo U.","Total","Obs.",""]}
        rows={inventory.map(e=>[e.date,e.lot,fmtN(e.quantity),fmt(e.unitCost),fmt(e.totalCost),e.notes||"—",
          <div style={{display:"flex",gap:4}}><EditBtn onClick={()=>openEdit(e)}/><DelBtn onClick={()=>delEntry(e)}/></div>
        ])}
      />
      {modal&&(
        <Modal title={editId?"Editar entrada":"Nueva entrada de inventario"} onClose={()=>setModal(false)}>
          <Alrt msg={err}/><Alrt msg={ok} type="ok"/>
          <InfoBox>📦 Producto: <strong>Salsa Ganso 250ml (SG-250)</strong></InfoBox>
          <Inp label="Fecha" type="date" value={form.date} onChange={f("date")}/>
          <Inp label="Lote" value={form.lot} onChange={f("lot")}/>
          <Inp label="Cantidad de piezas *" type="number" min="1" value={form.quantity} onChange={f("quantity")}/>
          <Inp label="Costo unitario" type="number" min="0" step="0.01" value={form.unitCost} onChange={f("unitCost")}/>
          <InfoBox>Costo total del lote: <strong>{fmt(totalCost)}</strong></InfoBox>
          <TA label="Observaciones" value={form.notes} onChange={f("notes")}/>
          <Btn onClick={save_} full>Guardar</Btn>
        </Modal>
      )}
    </div>
  );
}

// ─── ENTREGAS ────────────────────────────────────────────────────────────────
function Entregas({clients,deliveries,setDeliveries,metrics}) {
  const [modal,setModal] = useState(false);
  const [form,setForm] = useState({});
  const [editId,setEditId] = useState(null);
  const [err,setErr] = useState(""); const [ok,setOk] = useState("");
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const activeClients = clients.filter(c=>c.status==="Activo");
  const cName = id => clients.find(c=>c.id===id)?.businessName||"—";

  const openNew = () => { setForm({date:today(),clientId:"",lot:"",quantityDelivered:"",agreedUnitPrice:"",nextReviewDate:"",notes:""}); setEditId(null); setErr(""); setOk(""); setModal(true); };
  const openEdit = d => { setForm({...d,quantityDelivered:String(d.quantityDelivered),agreedUnitPrice:String(d.agreedUnitPrice)}); setEditId(d.id); setErr(""); setOk(""); setModal(true); };
  const delDel = d => { if(window.confirm("¿Eliminar esta entrega?")) setDeliveries(p=>p.filter(x=>x.id!==d.id)); };

  const qty = parseFloat(form.quantityDelivered)||0;
  const price = parseFloat(form.agreedUnitPrice)||0;
  const totalPotential = qty*price;

  const save_ = () => {
    if(!form.clientId) return setErr("Selecciona un cliente.");
    if(qty<=0) return setErr("La cantidad debe ser mayor a cero.");
    if(price<0) return setErr("El precio no puede ser negativo.");
    if(!editId && qty>metrics.stockAlmacen) return setErr(`Stock insuficiente. Disponible: ${fmtN(metrics.stockAlmacen)} pzas.`);
    const entry = {id:editId||uid(),date:form.date,clientId:form.clientId,lot:form.lot,quantityDelivered:qty,agreedUnitPrice:price,totalPotential,nextReviewDate:form.nextReviewDate,notes:form.notes};
    if(editId) setDeliveries(p=>p.map(x=>x.id===editId?entry:x));
    else setDeliveries(p=>[...p,entry]);
    setOk("Guardado."); setErr(""); setTimeout(()=>{setModal(false);setOk("");},800);
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <h2 style={{color:"#15803d",margin:0}}>Entregas a Consignación</h2>
        <Btn onClick={openNew}>+ Nueva</Btn>
      </div>
      <InfoBox>📦 Stock en almacén: <strong style={{color:metrics.stockAlmacen>0?"#15803d":"#dc2626"}}>{fmtN(metrics.stockAlmacen)} pzas</strong></InfoBox>
      <Tbl
        cols={["Fecha","Cliente","Lote","Pzas","P.U.","Total pot.","Próx. rev.",""]}
        rows={deliveries.map(d=>[d.date,cName(d.clientId),d.lot,fmtN(d.quantityDelivered),fmt(d.agreedUnitPrice),fmt(d.totalPotential),d.nextReviewDate||"—",
          <div style={{display:"flex",gap:4}}><EditBtn onClick={()=>openEdit(d)}/><DelBtn onClick={()=>delDel(d)}/></div>
        ])}
      />
      {modal&&(
        <Modal title={editId?"Editar entrega":"Nueva entrega a consignación"} onClose={()=>setModal(false)}>
          <Alrt msg={err}/><Alrt msg={ok} type="ok"/>
          {activeClients.length===0?<Alrt msg="Primero registra un cliente activo."/>:metrics.stockAlmacen<=0&&!editId?<Alrt msg="No hay stock disponible."/>:<>
            <InfoBox>📦 Producto: <strong>Salsa Ganso 250ml</strong> · Disponible: <strong>{fmtN(metrics.stockAlmacen)} pzas</strong></InfoBox>
            <Inp label="Fecha" type="date" value={form.date} onChange={f("date")}/>
            <Sel label="Cliente *" value={form.clientId} onChange={f("clientId")}>
              <option value="">Selecciona…</option>
              {activeClients.map(c=><option key={c.id} value={c.id}>{c.businessName}</option>)}
            </Sel>
            <Inp label="Lote" value={form.lot} onChange={f("lot")}/>
            <Inp label="Piezas entregadas *" type="number" min="1" value={form.quantityDelivered} onChange={f("quantityDelivered")}/>
            <Inp label="Precio unitario acordado" type="number" min="0" step="0.01" value={form.agreedUnitPrice} onChange={f("agreedUnitPrice")}/>
            <InfoBox>Total potencial: <strong>{fmt(totalPotential)}</strong></InfoBox>
            <Inp label="Próxima revisión" type="date" value={form.nextReviewDate} onChange={f("nextReviewDate")}/>
            <TA label="Observaciones" value={form.notes} onChange={f("notes")}/>
            <Btn onClick={save_} full>Guardar</Btn>
          </>}
        </Modal>
      )}
    </div>
  );
}

// ─── REVISIONES ──────────────────────────────────────────────────────────────
function Revisiones({clients,deliveries,reviews,setReviews,payments,setPayments}) {
  const [modal,setModal] = useState(false);
  const [form,setForm] = useState({});
  const [editId,setEditId] = useState(null);
  const [err,setErr] = useState(""); const [ok,setOk] = useState("");
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const cName = id => clients.find(c=>c.id===id)?.businessName||"—";

  const clientsWithStock = clients.filter(c=>clientMetrics(c.id,deliveries,reviews,payments).enConsignacion>0);

  const handleClientChange = e => {
    const id = e.target.value;
    const lastDel = deliveries.filter(d=>d.clientId===id).slice(-1)[0];
    setForm(p=>({...p,clientId:id,lot:lastDel?.lot||"",agreedUnitPrice:lastDel?.agreedUnitPrice||""}));
  };

  const openNew = () => { setForm({date:today(),clientId:"",lot:"",piecesSold:0,piecesReturnedGood:0,piecesDamaged:0,piecesRemaining:0,agreedUnitPrice:"",paymentReceived:0,paymentMethod:"Sin pago",notes:""}); setEditId(null); setErr(""); setOk(""); setModal(true); };
  const openEdit = r => { setForm({...r}); setEditId(r.id); setErr(""); setOk(""); setModal(true); };
  const delRev = r => {
    if(window.confirm("¿Eliminar esta revisión? También se eliminará el abono automático asociado.")) {
      setReviews(p=>p.filter(x=>x.id!==r.id));
      setPayments(p=>p.filter(x=>x.sourceReviewId!==r.id));
    }
  };

  const cStock = form.clientId ? clientMetrics(form.clientId,deliveries,reviews,payments).enConsignacion : 0;
  const cStockForEdit = form.clientId&&editId ? (() => {
    const revsExcl = reviews.filter(r=>r.id!==editId);
    return clientMetrics(form.clientId,deliveries,revsExcl,payments).enConsignacion;
  })() : cStock;
  const stockRef = editId ? cStockForEdit : cStock;

  const sold = parseFloat(form.piecesSold)||0;
  const retGood = parseFloat(form.piecesReturnedGood)||0;
  const damaged = parseFloat(form.piecesDamaged)||0;
  const remaining = parseFloat(form.piecesRemaining)||0;
  const agreedPrice = parseFloat(form.agreedUnitPrice)||0;
  const soldAmount = sold*agreedPrice;
  const paymentReceived = parseFloat(form.paymentReceived)||0;
  const balanceGenerated = soldAmount - paymentReceived;
  const sumPieces = sold+retGood+damaged+remaining;

  const save_ = () => {
    if(!form.clientId) return setErr("Selecciona un cliente.");
    if(sold<0||retGood<0||damaged<0||remaining<0) return setErr("No se permiten cantidades negativas.");
    if(sumPieces!==stockRef) return setErr(`La suma de piezas (${sumPieces}) no coincide con el stock del cliente (${stockRef}).`);
    const rev = {id:editId||uid(),date:form.date,clientId:form.clientId,lot:form.lot,piecesSold:sold,piecesReturnedGood:retGood,piecesDamaged:damaged,piecesRemaining:remaining,agreedUnitPrice:agreedPrice,soldAmount,paymentReceived,balanceGenerated,paymentMethod:form.paymentMethod,notes:form.notes};
    if(editId) {
      setReviews(p=>p.map(x=>x.id===editId?rev:x));
      setPayments(p=>p.filter(x=>x.sourceReviewId!==editId));
    } else {
      setReviews(p=>[...p,rev]);
    }
    if(paymentReceived>0) {
      setPayments(p=>[...p,{id:uid(),date:form.date,clientId:form.clientId,amount:paymentReceived,paymentMethod:form.paymentMethod,reference:"Abono en revisión",notes:`Generado desde revisión del ${form.date}`,sourceReviewId:rev.id}]);
    }
    setOk("Revisión guardada."); setErr(""); setTimeout(()=>{setModal(false);setOk("");},800);
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <h2 style={{color:"#15803d",margin:0}}>Revisiones de Consignación</h2>
        <Btn onClick={openNew}>+ Nueva</Btn>
      </div>
      <Tbl
        cols={["Fecha","Cliente","Lot","Vend.","Dev.","Daño","Importe","Abono",""]}
        rows={reviews.map(r=>[r.date,cName(r.clientId),r.lot||"—",fmtN(r.piecesSold),fmtN(r.piecesReturnedGood),fmtN(r.piecesDamaged),fmt(r.soldAmount),fmt(r.paymentReceived),
          <div style={{display:"flex",gap:4}}><EditBtn onClick={()=>openEdit(r)}/><DelBtn onClick={()=>delRev(r)}/></div>
        ])}
      />
      {modal&&(
        <Modal title={editId?"Editar revisión":"Nueva revisión"} onClose={()=>setModal(false)}>
          <Alrt msg={err}/><Alrt msg={ok} type="ok"/>
          {clientsWithStock.length===0&&!editId?<Alrt msg="No hay clientes con piezas en consignación."/>:<>
            <Inp label="Fecha" type="date" value={form.date} onChange={f("date")}/>
            <Sel label="Cliente *" value={form.clientId} onChange={handleClientChange}>
              <option value="">Selecciona…</option>
              {(editId?clients:clientsWithStock).map(c=><option key={c.id} value={c.id}>{c.businessName}</option>)}
            </Sel>
            {form.clientId&&<InfoBox color="#fef3c7">📦 Stock de referencia: <strong>{stockRef} pzas</strong> — la suma debe ser igual.</InfoBox>}
            <Sel label="Lote relacionado" value={form.lot} onChange={f("lot")}>
              <option value="">— Sin especificar —</option>
              {deliveries.filter(d=>d.clientId===form.clientId).map(d=><option key={d.id} value={d.lot}>{d.lot} ({fmtN(d.quantityDelivered)} pzas)</option>)}
            </Sel>
            <Inp label="Piezas vendidas" type="number" min="0" value={form.piecesSold} onChange={f("piecesSold")}/>
            <Inp label="Piezas devueltas (buenas)" type="number" min="0" value={form.piecesReturnedGood} onChange={f("piecesReturnedGood")}/>
            <Inp label="Piezas dañadas o perdidas" type="number" min="0" value={form.piecesDamaged} onChange={f("piecesDamaged")}/>
            <Inp label="Piezas que siguen en consignación" type="number" min="0" value={form.piecesRemaining} onChange={f("piecesRemaining")}/>
            <InfoBox color={sumPieces===stockRef?"#f0fdf4":"#fef2f2"}>
              Suma actual: <strong>{sumPieces}</strong> / Esperado: <strong>{stockRef}</strong> {sumPieces===stockRef?"✅":"⚠️"}
            </InfoBox>
            <Inp label="Precio unitario acordado" type="number" min="0" step="0.01" value={form.agreedUnitPrice} onChange={f("agreedUnitPrice")}/>
            <InfoBox>Importe vendido: <strong>{fmt(soldAmount)}</strong></InfoBox>
            <Inp label="Abono recibido en esta revisión" type="number" min="0" step="0.01" value={form.paymentReceived} onChange={f("paymentReceived")}/>
            <InfoBox color={balanceGenerated>0?"#fef2f2":"#f0fdf4"}>
              Saldo generado: <strong style={{color:balanceGenerated>0?"#dc2626":"#16a34a"}}>{fmt(balanceGenerated)}</strong>
            </InfoBox>
            <Sel label="Método de pago" value={form.paymentMethod} onChange={f("paymentMethod")}>
              <option>Sin pago</option><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option><option>Otro</option>
            </Sel>
            <TA label="Observaciones" value={form.notes} onChange={f("notes")}/>
            <Btn onClick={save_} full>Guardar revisión</Btn>
          </>}
        </Modal>
      )}
    </div>
  );
}

// ─── PAGOS ───────────────────────────────────────────────────────────────────
function Pagos({clients,deliveries,reviews,payments,setPayments}) {
  const [modal,setModal] = useState(false);
  const [form,setForm] = useState({});
  const [editId,setEditId] = useState(null);
  const [err,setErr] = useState(""); const [ok,setOk] = useState("");
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const cName = id => clients.find(c=>c.id===id)?.businessName||"—";

  const handleClientChange = e => {
    const id = e.target.value;
    setForm(p=>({...p,clientId:id}));
  };

  const openNew = () => { setForm({date:today(),clientId:"",amount:"",paymentMethod:"Efectivo",reference:"",notes:""}); setEditId(null); setErr(""); setOk(""); setModal(true); };
  const openEdit = p => { setForm({...p,amount:String(p.amount)}); setEditId(p.id); setErr(""); setOk(""); setModal(true); };
  const delPay = p => {
    if(p.sourceReviewId) return alert("Este pago fue generado automáticamente desde una revisión. Elimina la revisión para quitarlo.");
    if(window.confirm("¿Eliminar este pago?")) setPayments(prev=>prev.filter(x=>x.id!==p.id));
  };

  const amount = parseFloat(form.amount)||0;
  const selectedBalance = form.clientId ? clientMetrics(form.clientId,deliveries,reviews,payments).saldo : 0;

  const save_ = () => {
    if(!form.clientId) return setErr("Selecciona un cliente.");
    if(amount<=0) return setErr("El monto debe ser mayor a cero.");
    if(selectedBalance<=0) return setErr("Este cliente no tiene saldo pendiente.");
    if(amount>selectedBalance&&!window.confirm(`El abono (${fmt(amount)}) supera el saldo (${fmt(selectedBalance)}). ¿Continuar?`)) return;
    const pay = {id:editId||uid(),date:form.date,clientId:form.clientId,amount,paymentMethod:form.paymentMethod,reference:form.reference,notes:form.notes};
    if(editId) setPayments(p=>p.map(x=>x.id===editId?pay:x));
    else setPayments(p=>[...p,pay]);
    setOk("Pago guardado."); setErr(""); setTimeout(()=>{setModal(false);setOk("");},800);
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <h2 style={{color:"#15803d",margin:0}}>Pagos y Abonos</h2>
        <Btn onClick={openNew}>+ Nuevo</Btn>
      </div>

      {payments.length===0
        ? <div style={{color:"#9ca3af",textAlign:"center",padding:32}}>Sin pagos registrados.</div>
        : <Tbl
            cols={["Fecha","Cliente","Monto","Método","Ref.","Origen",""]}
            rows={payments.map(p=>[
              p.date,
              cName(p.clientId),
              fmt(p.amount),
              p.paymentMethod,
              p.reference||"—",
              p.sourceReviewId?<span style={{fontSize:11,background:"#dbeafe",color:"#1d4ed8",borderRadius:4,padding:"2px 6px"}}>Revisión</span>:<span style={{fontSize:11,background:"#d1fae5",color:"#15803d",borderRadius:4,padding:"2px 6px"}}>Manual</span>,
              <div style={{display:"flex",gap:4}}>
                {!p.sourceReviewId&&<EditBtn onClick={()=>openEdit(p)}/>}
                <DelBtn onClick={()=>delPay(p)}/>
              </div>
            ])}
          />
      }

      {modal&&(
        <Modal title={editId?"Editar pago":"Nuevo pago / abono"} onClose={()=>setModal(false)}>
          <Alrt msg={err}/><Alrt msg={ok} type="ok"/>
          <Inp label="Fecha" type="date" value={form.date} onChange={f("date")}/>
          <Sel label="Cliente *" value={form.clientId} onChange={handleClientChange}>
            <option value="">Selecciona…</option>
            {clients.filter(c=>c.status!=="Inactivo").map(c=>{
              const m = clientMetrics(c.id,deliveries,reviews,payments);
              return <option key={c.id} value={c.id}>{c.businessName} — saldo: {fmt(m.saldo)}</option>;
            })}
          </Sel>
          {form.clientId&&(
            <InfoBox color={selectedBalance>0?"#fef2f2":"#f0fdf4"}>
              Saldo pendiente: <strong style={{color:selectedBalance>0?"#dc2626":"#16a34a"}}>{fmt(selectedBalance)}</strong>
            </InfoBox>
          )}
          <Inp label="Monto abonado *" type="number" min="0.01" step="0.01" value={form.amount} onChange={f("amount")}/>
          <Sel label="Método de pago" value={form.paymentMethod} onChange={f("paymentMethod")}>
            <option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option><option>Otro</option>
          </Sel>
          <Inp label="Referencia" value={form.reference||""} onChange={f("reference")}/>
          <TA label="Observaciones" value={form.notes||""} onChange={f("notes")}/>
          <Btn onClick={save_} full>Guardar pago</Btn>
        </Modal>
      )}
    </div>
  );
}

// ─── REPORTES ────────────────────────────────────────────────────────────────
function Reportes({clients,inventory,deliveries,reviews,payments,metrics}) {
  const [tab,setTab] = useState("inventario");
  const [filterClient,setFilterClient] = useState("");
  const cName = id => clients.find(c=>c.id===id)?.businessName||"—";
  const tabs = [["inventario","Inventario"],["clientes","Clientes"],["saldos","Saldos"],["entregas","Entregas"],["pagos","Pagos"]];

  const fDels = filterClient?deliveries.filter(d=>d.clientId===filterClient):deliveries;
  const fPays = filterClient?payments.filter(p=>p.clientId===filterClient):payments;
  const fClients = filterClient?clients.filter(c=>c.id===filterClient):clients;

  return (
    <div>
      <h2 style={{color:"#15803d",marginTop:0}}>Reportes</h2>
      <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:14}}>
        {tabs.map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{whiteSpace:"nowrap",padding:"6px 12px",borderRadius:8,border:"none",background:tab===k?"#15803d":"#d1fae5",color:tab===k?"#fff":"#15803d",fontWeight:600,fontSize:12,cursor:"pointer"}}>{l}</button>)}
      </div>

      {["entregas","pagos","clientes"].includes(tab)&&(
        <Sel label="Filtrar por cliente" value={filterClient} onChange={e=>setFilterClient(e.target.value)}>
          <option value="">— Todos —</option>
          {clients.map(c=><option key={c.id} value={c.id}>{c.businessName}</option>)}
        </Sel>
      )}

      {tab==="inventario"&&(
        <div style={{background:"#fff",borderRadius:12,padding:16}}>
          {[["Total fabricado",fmtN(metrics.totalFab)+" pzas"],["En almacén",fmtN(metrics.stockAlmacen)+" pzas"],["Entregado consignación",fmtN(metrics.totalDelivered)+" pzas"],["En poder de clientes",fmtN(metrics.stockClientes)+" pzas"],["Vendidas",fmtN(metrics.totalSold)+" pzas"],["Devueltas buenas",fmtN(metrics.totalRetGood)+" pzas"],["Dañadas/perdidas",fmtN(metrics.totalDamaged)+" pzas"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f3f4f6",fontSize:14}}>
              <span style={{color:"#6b7280"}}>{l}</span><strong>{v}</strong>
            </div>
          ))}
        </div>
      )}

      {tab==="clientes"&&(
        <Tbl cols={["Cliente","Est.","Entregadas","Vendidas","Dev.","Daño","Consig.","Vendido","Abonado","Saldo","CxC","Últ.rev."]}
          rows={fClients.map(c=>{
            const m=clientMetrics(c.id,deliveries,reviews,payments);
            return [c.businessName,c.status,fmtN(m.piezasEntregadas),fmtN(m.piezasVendidas),fmtN(m.piezasDevueltas),fmtN(m.piezasDañadas),fmtN(m.enConsignacion),fmt(m.totalVendido),fmt(m.totalAbonado),<span style={{color:m.saldo>0?"#dc2626":"#16a34a",fontWeight:700}}>{fmt(m.saldo)}</span>,fmt(m.cxcPotencial),m.ultimaRevision||"—"];
          })}
        />
      )}

      {tab==="saldos"&&(
        <Tbl cols={["Cliente","WhatsApp","Saldo","CxC pot.","Consig.","Últ.rev.","Próx.rev."]}
          rows={clients.filter(c=>{const m=clientMetrics(c.id,deliveries,reviews,payments);return m.saldo>0;}).map(c=>{
            const m=clientMetrics(c.id,deliveries,reviews,payments);
            return [c.businessName,c.whatsapp||"—",<span style={{color:"#dc2626",fontWeight:700}}>{fmt(m.saldo)}</span>,fmt(m.cxcPotencial),fmtN(m.enConsignacion),m.ultimaRevision||"—",m.proximaRevision||"—"];
          })}
        />
      )}

      {tab==="entregas"&&(
        <Tbl cols={["Fecha","Cliente","Lote","Pzas","P.U.","Total pot.","Próx.rev."]}
          rows={fDels.map(d=>[d.date,cName(d.clientId),d.lot,fmtN(d.quantityDelivered),fmt(d.agreedUnitPrice),fmt(d.totalPotential),d.nextReviewDate||"—"])}
        />
      )}

      {tab==="pagos"&&(
        <Tbl cols={["Fecha","Cliente","Monto","Método","Ref.","Origen"]}
          rows={fPays.map(p=>[p.date,cName(p.clientId),fmt(p.amount),p.paymentMethod,p.reference||"—",p.sourceReviewId?"Revisión":"Manual"])}
        />
      )}
    </div>
  );
}

// ─── HISTORIAL ───────────────────────────────────────────────────────────────
function Historial({clients,deliveries,reviews,payments}) {
  const [clientId,setClientId] = useState("");
  const client = clients.find(c=>c.id===clientId);
  const m = clientId ? clientMetrics(clientId,deliveries,reviews,payments) : null;
  const cDels = clientId?deliveries.filter(d=>d.clientId===clientId):[];
  const cRevs = clientId?reviews.filter(r=>r.clientId===clientId):[];
  const cPays = clientId?payments.filter(p=>p.clientId===clientId):[];

  const timeline = [
    ...cDels.map(d=>({date:d.date,type:"entrega",data:d})),
    ...cRevs.map(r=>({date:r.date,type:"revision",data:r})),
    ...cPays.filter(p=>!p.sourceReviewId).map(p=>({date:p.date,type:"pago",data:p})),
  ].sort((a,b)=>a.date.localeCompare(b.date));

  const copyResumen = () => {
    if(!client||!m) return;
    const txt = `Hola ${client.businessName}, te compartimos el resumen de consignación de Salsa Ganso 250ml:\n\n- Piezas entregadas: ${fmtN(m.piezasEntregadas)}\n- Piezas vendidas: ${fmtN(m.piezasVendidas)}\n- Piezas devueltas: ${fmtN(m.piezasDevueltas)}\n- Piezas dañadas: ${fmtN(m.piezasDañadas)}\n- Piezas en consignación: ${fmtN(m.enConsignacion)}\n- Total vendido: ${fmt(m.totalVendido)}\n- Total abonado: ${fmt(m.totalAbonado)}\n- Saldo pendiente: ${fmt(m.saldo)}\n- Valor en calle (CxC): ${fmt(m.cxcPotencial)}\n- Próxima revisión: ${m.proximaRevision||"—"}\n\nGracias.`;
    navigator.clipboard.writeText(txt).then(()=>alert("Copiado al portapapeles ✅"));
  };

  const colors = {entrega:"#7c3aed",revision:"#2563eb",pago:"#16a34a"};
  const labels = {entrega:"🚚 Entrega",revision:"🔍 Revisión",pago:"💳 Pago"};

  return (
    <div>
      <h2 style={{color:"#15803d",marginTop:0}}>Historial por Cliente</h2>
      <Sel label="Selecciona un cliente" value={clientId} onChange={e=>setClientId(e.target.value)}>
        <option value="">— Selecciona —</option>
        {clients.map(c=><option key={c.id} value={c.id}>{c.businessName}</option>)}
      </Sel>

      {client&&m&&(<>
        <div style={{background:"#fff",borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontWeight:700,fontSize:16}}>{client.businessName}</div>
              <div style={{fontSize:12,color:"#6b7280"}}>{client.responsibleName} · {client.whatsapp}</div>
              <div style={{fontSize:12,color:"#6b7280"}}>{client.email}</div>
              <div style={{fontSize:12,color:"#6b7280"}}>{client.address}</div>
            </div>
            <span style={{background:client.status==="Activo"?"#d1fae5":"#fef3c7",color:client.status==="Activo"?"#15803d":"#92400e",borderRadius:6,padding:"2px 10px",fontSize:12,fontWeight:700}}>{client.status}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:14,fontSize:13}}>
            {[["Pzas entregadas",fmtN(m.piezasEntregadas)],["En consignación",fmtN(m.enConsignacion)],["Pzas vendidas",fmtN(m.piezasVendidas)],["Pzas devueltas",fmtN(m.piezasDevueltas)],["Pzas dañadas",fmtN(m.piezasDañadas)],["Total vendido",fmt(m.totalVendido)],["Total abonado",fmt(m.totalAbonado)],["Saldo pendiente",fmt(m.saldo)],["CxC potencial",fmt(m.cxcPotencial)]].map(([l,v])=>(
              <div key={l}><span style={{color:"#6b7280"}}>{l}: </span><strong>{v}</strong></div>
            ))}
          </div>
          <div style={{marginTop:14}}>
            <Btn onClick={copyResumen}>📋 Copiar resumen para cliente</Btn>
          </div>
        </div>

        <h3 style={{color:"#15803d"}}>Línea de tiempo</h3>
        {timeline.length===0?<div style={{color:"#9ca3af",textAlign:"center",padding:24}}>Sin movimientos.</div>:timeline.map((ev,i)=>(
          <div key={i} style={{display:"flex",gap:10,marginBottom:8}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:colors[ev.type],marginTop:5,flexShrink:0}}/>
              {i<timeline.length-1&&<div style={{width:2,flex:1,background:"#e5e7eb",marginTop:2}}/>}
            </div>
            <div style={{background:"#fff",borderRadius:10,padding:"10px 14px",flex:1,boxShadow:"0 1px 3px #0001",marginBottom:2}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontWeight:700,fontSize:12,color:colors[ev.type]}}>{labels[ev.type]}</span>
                <span style={{fontSize:11,color:"#9ca3af"}}>{ev.date}</span>
              </div>
              {ev.type==="entrega"&&<div style={{fontSize:12,marginTop:3}}>Lote: {ev.data.lot} · {fmtN(ev.data.quantityDelivered)} pzas · {fmt(ev.data.agreedUnitPrice)}/pza · Total pot.: {fmt(ev.data.totalPotential)}</div>}
              {ev.type==="revision"&&<div style={{fontSize:12,marginTop:3}}>Vendidas: {ev.data.piecesSold} · Dev.: {ev.data.piecesReturnedGood} · Daño: {ev.data.piecesDamaged} · Importe: {fmt(ev.data.soldAmount)} · Abono: {fmt(ev.data.paymentReceived)}</div>}
              {ev.type==="pago"&&<div style={{fontSize:12,marginTop:3}}>Monto: {fmt(ev.data.amount)} · {ev.data.paymentMethod}{ev.data.reference?` · Ref: ${ev.data.reference}`:""}</div>}
              {ev.data.notes&&<div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{ev.data.notes}</div>}
            </div>
          </div>
        ))}
      </>)}
    </div>
  );
}
