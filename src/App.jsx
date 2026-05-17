import { useState, useEffect } from "react";function clientMetrics(clientId, deliveries, reviews, payments) {
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
    const nums = inventory.map(e=>{const m=e.lot?.match(/L(\d+)$/);return m?parseInt(m[1]
