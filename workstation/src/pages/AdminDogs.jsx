import React, { useEffect, useState } from "react"
import { sendMessage } from "../services/messaging"
import AdminSidebar from "../components/AdminSidebar"

const A = {
  bg:'#0d0d0d', card:'#141414', border:'#1f1f1f',
  red:'#dc2626', text:'#ffffff', muted:'#888888', subtle:'#555555',
}

const EMPTY = {
  name:'', breed:'', age_years:'', size:'medium', gender:'male',
  energy_level:'medium', description:'', status:'available',
  good_with_kids:false, good_with_dogs:false, good_with_cats:false,
  apartment_friendly:false, is_vaccinated:false, is_spayed_neutered:false,
  shelter_id:1,
}

export default function AdminDogs() {
  const [dogs, setDogs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [formData, setFormData] = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [successMsg, setSuccessMsg]     = useState("")

  useEffect(() => { loadDogs() }, [])

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

  const openAdd = () => { setEditing(null); setFormData(EMPTY); setShowForm(true) }
  const openEdit = (dog) => {
    setEditing(dog.dog_id)
    setFormData({
      name:              dog.name            || '',
      breed:             dog.breed           || '',
      age_years:         dog.age_years       || '',
      size:              dog.size            || 'medium',
      gender:            dog.gender          || 'male',
      energy_level:      dog.energy_level    || 'medium',
      description:       dog.description     || '',
      status:            dog.status          || 'available',
      good_with_kids:    !!dog.good_with_kids,
      good_with_dogs:    !!dog.good_with_dogs,
      good_with_cats:    !!dog.good_with_cats,
      apartment_friendly:!!dog.apartment_friendly,
      is_vaccinated:     !!dog.is_vaccinated,
      is_spayed_neutered:!!dog.is_spayed_neutered,
      shelter_id:        dog.shelter_id      || 1,
      external_id:       dog.external_id     || '',
    })
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const result = await sendMessage("request.api.dog.upsert", {
        ...formData,
        age_years:  parseInt(formData.age_years) || 0,
        shelter_id: parseInt(formData.shelter_id) || 1,
        external_id: editing ? (formData.external_id || '') : '',
        source: 'admin',
      })
      if (result?.success) {
        setSuccessMsg(editing ? 'Dog updated.' : 'Dog added.')
        setShowForm(false)
        setEditing(null)
        setFormData(EMPTY)
        loadDogs()
        setTimeout(() => setSuccessMsg(''), 4000)
      }
    } catch { } finally { setSaving(false) }
  }

  const handleStatusChange = async (dog, newStatus) => {
    try {
      await sendMessage("request.api.dog.upsert", {
        ...dog,
        status: newStatus,
        external_id: dog.external_id || '',
        shelter_id: dog.shelter_id || 1,
        source: 'admin',
      })
      setDogs(prev => prev.map(d => d.dog_id === dog.dog_id ? { ...d, status: newStatus } : d))
    } catch { }
  }

  const filtered = dogs.filter(d => {
    const matchSearch = (d.name||'').toLowerCase().includes(search.toLowerCase()) || (d.breed||'').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || d.status === filterStatus
    return matchSearch && matchStatus
  })

  const inputStyle = { background:'#111', border:`1px solid ${A.border}`, borderRadius:'8px', padding:'9px 14px', color: A.text, fontSize:'13px', outline:'none', width:'100%', boxSizing:'border-box' }
  const labelStyle = { fontSize:'12px', fontWeight:'600', color: A.muted, textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:'6px' }

  const statusStyle = (s) => {
    switch(s) {
      case 'available': return { bg:'#052e16', color:'#4ade80' }
      case 'adopted':   return { bg:'#0c1a4a', color:'#60a5fa' }
      default:          return { bg:'#1c1917', color:'#fbbf24' }
    }
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background: A.bg }}>
      <AdminSidebar />
      <div style={{ flex:1, padding:'40px', overflowY:'auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'28px', flexWrap:'wrap', gap:'16px' }}>
          <div>
            <h1 style={{ margin:'0 0 6px 0', color: A.text, fontSize:'28px', fontWeight:'700' }}>Dog Listings</h1>
            <p style={{ margin:0, color: A.muted }}>{dogs.length} dogs in the system.</p>
          </div>
          <button
            onClick={showForm && !editing ? () => setShowForm(false) : openAdd}
            style={{ background: A.red, border:'none', borderRadius:'8px', padding:'10px 20px', color:'white', fontWeight:'600', fontSize:'14px', cursor:'pointer' }}
          >
            {showForm && !editing ? 'Cancel' : '+ Add Dog'}
          </button>
        </div>

        {successMsg && (
          <div style={{ background:'#052e16', border:'1px solid #166534', borderRadius:'8px', padding:'12px 16px', marginBottom:'20px', color:'#4ade80', fontSize:'14px' }}>
            {successMsg}
          </div>
        )}

        {showForm && (
          <div style={{ background: A.card, borderRadius:'12px', border:`1px solid ${A.border}`, padding:'28px', marginBottom:'28px' }}>
            <h2 style={{ margin:'0 0 24px 0', color: A.text, fontSize:'17px', fontWeight:'600' }}>{editing ? 'Edit Dog' : 'Add New Dog'}</h2>
            <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
                {[
                  { label:'Name', name:'name', required:true, placeholder:'Dog name' },
                  { label:'Breed', name:'breed', required:true, placeholder:'e.g. Labrador Mix' },
                  { label:'Age (years)', name:'age_years', type:'number', required:true, placeholder:'2' },
                ].map(f => (
                  <div key={f.name}>
                    <label style={labelStyle}>{f.label}</label>
                    <input required={f.required} type={f.type||'text'} name={f.name} value={formData[f.name]} onChange={handleChange} style={inputStyle} placeholder={f.placeholder} />
                  </div>
                ))}
                {[
                  { label:'Gender', name:'gender', options:[['male','Male'],['female','Female']] },
                  { label:'Size', name:'size', options:[['small','Small'],['medium','Medium'],['large','Large']] },
                  { label:'Energy Level', name:'energy_level', options:[['low','Low'],['medium','Medium'],['high','High']] },
                  { label:'Status', name:'status', options:[['available','Available'],['pending','Pending'],['adopted','Adopted']] },
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

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'10px' }}>
                {[
                  { name:'good_with_kids',      label:'Good with kids' },
                  { name:'good_with_dogs',      label:'Good with dogs' },
                  { name:'good_with_cats',      label:'Good with cats' },
                  { name:'apartment_friendly',  label:'Apartment friendly' },
                  { name:'is_vaccinated',       label:'Vaccinated' },
                  { name:'is_spayed_neutered',  label:'Spayed / Neutered' },
                ].map(cb => (
                  <label key={cb.name} style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', color:'#aaa', fontSize:'14px' }}>
                    <input type="checkbox" name={cb.name} checked={formData[cb.name]} onChange={handleChange} style={{ accentColor: A.red, width:'15px', height:'15px' }} />
                    {cb.label}
                  </label>
                ))}
              </div>

              <div style={{ display:'flex', gap:'12px' }}>
                <button type="submit" disabled={saving} style={{ background: A.red, border:'none', borderRadius:'8px', padding:'11px 28px', color:'white', fontWeight:'600', fontSize:'14px', cursor:'pointer' }}>
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Dog'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null) }} style={{ background:'transparent', border:`1px solid ${A.border}`, borderRadius:'8px', padding:'11px 20px', color: A.muted, fontSize:'14px', cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display:'flex', gap:'12px', marginBottom:'20px', flexWrap:'wrap' }}>
          <input style={{ background:'#111', border:`1px solid ${A.border}`, borderRadius:'8px', padding:'9px 14px', color: A.text, fontSize:'13px', outline:'none', width:'260px' }}
            placeholder="Search by name or breed..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={{ background:'#111', border:`1px solid ${A.border}`, borderRadius:'8px', padding:'9px 14px', color: A.text, fontSize:'13px', outline:'none' }}
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="pending">Pending</option>
            <option value="adopted">Adopted</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {[1,2,3].map(i => <div key={i} style={{ background: A.card, borderRadius:'10px', padding:'20px', border:`1px solid ${A.border}`, height:'50px' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px', color: A.muted }}>No dogs found.</div>
        ) : (
          <div style={{ background: A.card, borderRadius:'12px', border:`1px solid ${A.border}`, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#111' }}>
                  {['Name','Breed','Age','Size','Status','Change Status','Actions'].map(h => (
                    <th key={h} style={{ padding:'11px 20px', textAlign:'left', fontSize:'11px', fontWeight:'700', color: A.subtle, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((dog, i) => {
                  const ss = statusStyle(dog.status)
                  return (
                    <tr key={dog.dog_id||i} style={{ borderTop:`1px solid ${A.border}` }}>
                      <td style={{ padding:'13px 20px', color: A.text, fontWeight:'600', fontSize:'14px' }}>{dog.name}</td>
                      <td style={{ padding:'13px 20px', color: A.muted, fontSize:'13px' }}>{dog.breed}</td>
                      <td style={{ padding:'13px 20px', color: A.muted, fontSize:'13px' }}>{dog.age_years} yr</td>
                      <td style={{ padding:'13px 20px', color: A.muted, fontSize:'13px', textTransform:'capitalize' }}>{dog.size}</td>
                      <td style={{ padding:'13px 20px' }}>
                        <span style={{ background: ss.bg, color: ss.color, padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'600', textTransform:'capitalize' }}>{dog.status}</span>
                      </td>
                      <td style={{ padding:'13px 20px' }}>
                        <select
                          value={dog.status}
                          onChange={e => handleStatusChange(dog, e.target.value)}
                          style={{ background:'#111', border:`1px solid ${A.border}`, borderRadius:'6px', padding:'5px 10px', color: A.text, fontSize:'12px', outline:'none' }}
                        >
                          <option value="available">Available</option>
                          <option value="pending">Pending</option>
                          <option value="adopted">Adopted</option>
                        </select>
                      </td>
                      <td style={{ padding:'13px 20px' }}>
                        <button onClick={() => openEdit(dog)} style={{ background:'transparent', border:`1px solid ${A.border}`, borderRadius:'6px', padding:'5px 12px', color: A.muted, fontSize:'12px', cursor:'pointer' }}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}