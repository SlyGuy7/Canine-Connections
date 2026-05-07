import React, { useEffect, useState } from "react"
import { sendMessage } from "../services/messaging"
import AdminSidebar from "../components/AdminSidebar"

const A = {
  bg:     '#0a0a0a',
  card:   '#111111',
  card2:  '#141414',
  border: '#1a1a1a',
  red:    '#dc2626',
  text:   '#f0f0f0',
  muted:  '#777777',
  subtle: '#444444',
}

const PAGE_SIZE = 20

const EMPTY = {
  name:'', breed:'', age_years:'', size:'medium', gender:'male',
  energy_level:'medium', description:'', status:'available',
  good_with_kids:false, good_with_dogs:false, good_with_cats:false,
  apartment_friendly:false, is_vaccinated:false, is_spayed_neutered:false,
  shelter_id:1,
}

const dogStatusStyle = (s) => {
  switch (s) {
    case 'available': return { bg:'#052e16', color:'#4ade80', label:'Available' }
    case 'adopted':   return { bg:'#0c1a4a', color:'#60a5fa', label:'Adopted' }
    default:          return { bg:'#1c1917', color:'#fbbf24', label:'Pending' }
  }
}

const traitPills = (dog) => {
  const traits = []
  if (dog.is_vaccinated == 1)      traits.push({ label:'Vaccinated', color:'#4ade80', bg:'#052e16' })
  if (dog.is_spayed_neutered == 1) traits.push({ label:'Neutered',   color:'#60a5fa', bg:'#0c1a4a' })
  if (dog.good_with_kids == 1)     traits.push({ label:'Kids OK',    color:'#fbbf24', bg:'#1c1917' })
  if (dog.apartment_friendly == 1) traits.push({ label:'Apt. OK',    color:'#a78bfa', bg:'#1e1b4b' })
  return traits.slice(0, 3)
}

function Paginator({ page, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }

  const btn = (label, target, disabled = false, active = false) => (
    <button
      key={label + target}
      onClick={() => !disabled && target && onChange(target)}
      disabled={disabled}
      style={{
        background: active ? A.red : 'transparent',
        border: `1px solid ${active ? A.red : A.border}`,
        borderRadius: '6px',
        padding: '5px 10px',
        color: active ? 'white' : disabled ? A.subtle : A.muted,
        fontSize: '12px',
        fontWeight: active ? '700' : '400',
        cursor: disabled ? 'default' : 'pointer',
        minWidth: '32px',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderTop:`1px solid ${A.border}` }}>
      <p style={{ margin:0, color: A.subtle, fontSize:'12px' }}>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} dogs
      </p>
      <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
        {btn('‹ Prev', page - 1, page === 1)}
        {pages.map((p, i) =>
          p === '…'
            ? <span key={'ellipsis' + i} style={{ padding:'5px 4px', color: A.subtle, fontSize:'12px' }}>…</span>
            : btn(p, p, false, p === page)
        )}
        {btn('Next ›', page + 1, page === totalPages)}
      </div>
    </div>
  )
}

export default function AdminDogs() {
  const [dogs, setDogs]                 = useState([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [editing, setEditing]           = useState(null)
  const [formData, setFormData]         = useState(EMPTY)
  const [saving, setSaving]             = useState(false)
  const [search, setSearch]             = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [successMsg, setSuccessMsg]     = useState("")
  const [hoveredRow, setHoveredRow]     = useState(null)
  const [page, setPage]                 = useState(1)
  const [savingStatus, setSavingStatus] = useState(null)

  useEffect(() => { loadDogs() }, [])
  useEffect(() => { setPage(1) }, [search, filterStatus])

  async function loadDogs() {
    setLoading(true)
    try {
      const result = await sendMessage("request.dogs.list", { limit: 500 })
      setDogs(result?.dogs || [])
    } catch { setDogs([]) } finally { setLoading(false) }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const openAdd = () => { setEditing(null); setFormData(EMPTY); setShowForm(true); window.scrollTo(0,0) }
  const openEdit = (dog) => {
    setEditing(dog.dog_id)
    setFormData({
      name:               dog.name             || '',
      breed:              dog.breed            || '',
      age_years:          dog.age_years        || '',
      size:               dog.size             || 'medium',
      gender:             dog.gender           || 'male',
      energy_level:       dog.energy_level     || 'medium',
      description:        dog.description      || '',
      status:             dog.status           || 'available',
      good_with_kids:     dog.good_with_kids == 1,
      good_with_dogs:     dog.good_with_dogs == 1,
      good_with_cats:     dog.good_with_cats == 1,
      apartment_friendly: dog.apartment_friendly == 1,
      is_vaccinated:      dog.is_vaccinated == 1,
      is_spayed_neutered: dog.is_spayed_neutered == 1,
      shelter_id:         dog.shelter_id       || 1,
      external_id:        dog.external_id      || '',
    })
    setShowForm(true)
    window.scrollTo(0, 0)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const result = await sendMessage("request.api.dog.upsert", {
        ...(editing ? { dog_id: editing } : {}),
        ...formData,
        age_years:   parseInt(formData.age_years) || 0,
        shelter_id:  parseInt(formData.shelter_id) || 1,
        external_id: editing ? (formData.external_id || '') : '',
        source: 'admin',
      })
      if (result?.success) {
        setSuccessMsg(editing ? 'Dog updated.' : 'Dog added.')
        setShowForm(false); setEditing(null); setFormData(EMPTY)
        loadDogs()
        setTimeout(() => setSuccessMsg(''), 4000)
      }
    } catch { } finally { setSaving(false) }
  }

  const handleStatusChange = async (dog, newStatus) => {
    setSavingStatus(dog.dog_id)
    try {
      const result = await sendMessage("request.api.dog.upsert", {
        dog_id: dog.dog_id, ...dog, status: newStatus,
        external_id: dog.external_id || '',
        shelter_id: dog.shelter_id || 1,
        source: 'admin',
      })
      if (result?.success) {
        setDogs(prev => prev.map(d => d.dog_id === dog.dog_id ? { ...d, status: newStatus } : d))
      }
    } catch { } finally { setSavingStatus(null) }
  }

  const counts = {
    all:       dogs.length,
    available: dogs.filter(d => d.status === 'available').length,
    pending:   dogs.filter(d => d.status === 'pending').length,
    adopted:   dogs.filter(d => d.status === 'adopted').length,
  }

  const filtered = dogs.filter(d => {
    const matchSearch = (d.name||'').toLowerCase().includes(search.toLowerCase()) || (d.breed||'').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || d.status === filterStatus
    return matchSearch && matchStatus
  })

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const inputStyle  = { background:'#0d0d0d', border:`1px solid ${A.border}`, borderRadius:'8px', padding:'9px 14px', color: A.text, fontSize:'13px', outline:'none', width:'100%', boxSizing:'border-box' }
  const labelStyle  = { fontSize:'11px', fontWeight:'700', color: A.subtle, textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:'6px' }

  const tabs = [
    { key:'all',       label:'All',       count: counts.all },
    { key:'available', label:'Available', count: counts.available },
    { key:'pending',   label:'Pending',   count: counts.pending },
    { key:'adopted',   label:'Adopted',   count: counts.adopted },
  ]

  return (
    <div style={{ display:'flex', minHeight:'100vh', background: A.bg }}>
      <AdminSidebar />
      <div style={{ flex:1, padding:'36px 40px', overflowY:'auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'28px', flexWrap:'wrap', gap:'16px' }}>
          <div>
            <p style={{ margin:'0 0 4px 0', fontSize:'12px', color: A.subtle, fontWeight:'600', letterSpacing:'0.1em', textTransform:'uppercase' }}>Admin Dashboard</p>
            <h1 style={{ margin:'0 0 4px 0', color: A.text, fontSize:'26px', fontWeight:'700' }}>Dog Listings</h1>
            <p style={{ margin:0, color: A.muted, fontSize:'13px' }}>
              {loading ? '—' : `${counts.available} available · ${counts.all} total`}
            </p>
          </div>
          <button
            onClick={showForm && !editing ? () => setShowForm(false) : openAdd}
            style={{ background: showForm && !editing ? 'transparent' : A.red, border:`1px solid ${showForm && !editing ? A.border : A.red}`, borderRadius:'8px', padding:'10px 20px', color: showForm && !editing ? A.muted : 'white', fontWeight:'600', fontSize:'13px', cursor:'pointer', transition:'all 0.15s' }}
          >
            {showForm && !editing ? 'Cancel' : '+ Add Dog'}
          </button>
        </div>

        {/* Success toast */}
        {successMsg && (
          <div style={{ background:'#052e16', border:'1px solid #166534', borderRadius:'10px', padding:'12px 18px', marginBottom:'20px', color:'#4ade80', fontSize:'13px', display:'flex', alignItems:'center', gap:'8px' }}>
            <span style={{ fontWeight:'700' }}>✓</span> {successMsg}
          </div>
        )}

        {/* Add / Edit form */}
        {showForm && (
          <div style={{ background: A.card, borderRadius:'14px', border:`1px solid ${A.border}`, padding:'28px', marginBottom:'28px' }}>
            <h2 style={{ margin:'0 0 24px 0', color: A.text, fontSize:'16px', fontWeight:'600' }}>
              {editing ? 'Edit Dog' : 'Add New Dog'}
            </h2>
            <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
                {[
                  { label:'Name',        name:'name',      required:true, placeholder:'Dog name' },
                  { label:'Breed',       name:'breed',     required:true, placeholder:'e.g. Labrador Mix' },
                  { label:'Age (years)', name:'age_years', type:'number', required:true, placeholder:'2' },
                ].map(f => (
                  <div key={f.name}>
                    <label style={labelStyle}>{f.label}</label>
                    <input required={f.required} type={f.type||'text'} name={f.name} value={formData[f.name]} onChange={handleChange} style={inputStyle} placeholder={f.placeholder} />
                  </div>
                ))}
                {[
                  { label:'Gender',       name:'gender',       options:[['male','Male'],['female','Female']] },
                  { label:'Size',         name:'size',         options:[['small','Small'],['medium','Medium'],['large','Large']] },
                  { label:'Energy Level', name:'energy_level', options:[['low','Low'],['medium','Medium'],['high','High']] },
                  { label:'Status',       name:'status',       options:[['available','Available'],['pending','Pending'],['adopted','Adopted']] },
                ].map(f => (
                  <div key={f.name}>
                    <label style={labelStyle}>{f.label}</label>
                    <select name={f.name} value={formData[f.name]} onChange={handleChange} style={inputStyle}>
                      {f.options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label style={labelStyle}>Shelter ID</label>
                  <input type="number" name="shelter_id" value={formData.shelter_id} onChange={handleChange} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} style={{ ...inputStyle, resize:'vertical' }} rows={3} placeholder="Tell adopters about this dog." />
              </div>

              <div>
                <p style={{ ...labelStyle, marginBottom:'10px' }}>Traits</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'8px' }}>
                  {[
                    { name:'good_with_kids',      label:'Good with kids' },
                    { name:'good_with_dogs',      label:'Good with dogs' },
                    { name:'good_with_cats',      label:'Good with cats' },
                    { name:'apartment_friendly',  label:'Apartment friendly' },
                    { name:'is_vaccinated',       label:'Vaccinated' },
                    { name:'is_spayed_neutered',  label:'Spayed / Neutered' },
                  ].map(cb => (
                    <label key={cb.name} style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', color:'#aaa', fontSize:'13px', padding:'8px 10px', background:'#0d0d0d', borderRadius:'8px', border:`1px solid ${A.border}` }}>
                      <input type="checkbox" name={cb.name} checked={formData[cb.name]} onChange={handleChange} style={{ accentColor: A.red, width:'14px', height:'14px' }} />
                      {cb.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display:'flex', gap:'10px' }}>
                <button type="submit" disabled={saving} style={{ background: A.red, border:'none', borderRadius:'8px', padding:'10px 26px', color:'white', fontWeight:'600', fontSize:'13px', cursor:'pointer' }}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Dog'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null) }} style={{ background:'transparent', border:`1px solid ${A.border}`, borderRadius:'8px', padding:'10px 20px', color: A.muted, fontSize:'13px', cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'12px' }}>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {tabs.map(tab => {
              const active = filterStatus === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilterStatus(tab.key)}
                  style={{
                    background: active ? '#1a0000' : 'transparent',
                    border: `1px solid ${active ? A.red : A.border}`,
                    borderRadius:'8px', padding:'7px 14px', cursor:'pointer',
                    color: active ? '#f87171' : A.muted,
                    fontSize:'12px', fontWeight: active ? '700' : '400',
                    display:'flex', alignItems:'center', gap:'6px', transition:'all 0.15s',
                  }}
                >
                  {tab.label}
                  <span style={{ background: active ? 'rgba(220,38,38,0.2)' : '#1a1a1a', color: active ? '#f87171' : A.subtle, padding:'1px 7px', borderRadius:'10px', fontSize:'11px', fontWeight:'700' }}>
                    {loading ? '—' : tab.count}
                  </span>
                </button>
              )
            })}
          </div>
          <input
            style={{ background:'#0d0d0d', border:`1px solid ${A.border}`, borderRadius:'8px', padding:'8px 14px', color: A.text, fontSize:'13px', outline:'none', width:'220px' }}
            placeholder="Search name or breed…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div style={{ background: A.card, borderRadius:'12px', border:`1px solid ${A.border}`, overflow:'hidden' }}>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'0' }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ padding:'16px 20px', borderBottom:`1px solid ${A.border}`, display:'flex', gap:'20px', alignItems:'center' }}>
                  <div style={{ height:'13px', background:'#1a1a1a', borderRadius:'4px', width:'140px' }} />
                  <div style={{ height:'13px', background:'#1a1a1a', borderRadius:'4px', width:'60px' }} />
                  <div style={{ height:'20px', background:'#1a1a1a', borderRadius:'10px', width:'80px' }} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'80px', color: A.muted }}>
              <div style={{ fontSize:'36px', marginBottom:'12px', opacity:0.3 }}>🐾</div>
              <p style={{ margin:0, fontSize:'14px' }}>No dogs found.</p>
            </div>
          ) : (
            <>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#0d0d0d' }}>
                    {['Name & Breed', 'Age / Size', 'Traits', 'Status', 'Change Status', ''].map(h => (
                      <th key={h} style={{ padding:'11px 20px', textAlign:'left', fontSize:'10px', fontWeight:'700', color: A.subtle, textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((dog) => {
                    const ss = dogStatusStyle(dog.status)
                    const traits = traitPills(dog)
                    const hovered = hoveredRow === dog.dog_id
                    const isSaving = savingStatus === dog.dog_id
                    return (
                      <tr
                        key={dog.dog_id}
                        style={{ borderTop:`1px solid ${A.border}`, background: hovered ? A.card2 : 'transparent', transition:'background 0.1s' }}
                        onMouseEnter={() => setHoveredRow(dog.dog_id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        <td style={{ padding:'13px 20px', maxWidth:'220px' }}>
                          <p style={{ margin:'0 0 2px 0', color: A.text, fontWeight:'600', fontSize:'13px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{dog.name}</p>
                          <p style={{ margin:0, color: A.muted, fontSize:'11px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{dog.breed}</p>
                        </td>
                        <td style={{ padding:'13px 20px', whiteSpace:'nowrap' }}>
                          <p style={{ margin:'0 0 2px 0', color: A.muted, fontSize:'12px' }}>{dog.age_years} yr</p>
                          <p style={{ margin:0, color: A.subtle, fontSize:'11px', textTransform:'capitalize' }}>{dog.size}</p>
                        </td>
                        <td style={{ padding:'13px 20px', minWidth:'160px' }}>
                          <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                            {traits.length === 0
                              ? <span style={{ color: A.subtle, fontSize:'11px' }}>—</span>
                              : traits.map(t => (
                                  <span key={t.label} style={{ background: t.bg, color: t.color, padding:'2px 8px', borderRadius:'12px', fontSize:'10px', fontWeight:'600', whiteSpace:'nowrap' }}>{t.label}</span>
                                ))
                            }
                          </div>
                        </td>
                        <td style={{ padding:'13px 20px', whiteSpace:'nowrap' }}>
                          <span style={{ background: ss.bg, color: ss.color, padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600' }}>{ss.label}</span>
                        </td>
                        <td style={{ padding:'13px 20px', whiteSpace:'nowrap' }}>
                          <select
                            value={dog.status}
                            disabled={isSaving}
                            onChange={e => handleStatusChange(dog, e.target.value)}
                            style={{ background:'#0d0d0d', border:`1px solid ${A.border}`, borderRadius:'6px', padding:'5px 10px', color: isSaving ? A.subtle : A.text, fontSize:'12px', outline:'none', cursor:'pointer', opacity: isSaving ? 0.5 : 1 }}
                          >
                            <option value="available">Available</option>
                            <option value="pending">Pending</option>
                            <option value="adopted">Adopted</option>
                          </select>
                        </td>
                        <td style={{ padding:'13px 20px', whiteSpace:'nowrap' }}>
                          <button
                            onClick={() => openEdit(dog)}
                            style={{ background:'transparent', border:`1px solid ${A.border}`, borderRadius:'6px', padding:'5px 12px', color: A.muted, fontSize:'11px', cursor:'pointer', transition:'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor='#333'; e.currentTarget.style.color=A.text }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor=A.border; e.currentTarget.style.color=A.muted }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <Paginator page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
            </>
          )}
        </div>

      </div>
    </div>
  )
}
