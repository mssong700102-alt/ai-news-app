import { useState, useEffect, useCallback, useRef } from 'react'

const TOPICS = [
  { id: 'ai', label: 'AI', query: 'AI artificial intelligence latest news 2026', color: '#00D4FF' },
  { id: 'semiconductor', label: '반도체', query: 'semiconductor chip industry news 2026', color: '#FF6B35' },
  { id: 'llm', label: 'LLM', query: 'LLM large language model GPT Claude Gemini news 2026', color: '#A855F7' },
]

const NEWS_KEY = 'ainews_data_v2'
const APIKEY_KEY = 'ainews_apikey'

function hexToRgb(hex) {
  return [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)).join(',')
}
function getNextAlarm() {
  const now = new Date(), next = new Date()
  next.setHours(7,0,0,0)
  if (now >= next) next.setDate(next.getDate()+1)
  return next
}
function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00'
  const h = Math.floor(ms/3600000)
  const m = Math.floor((ms%3600000)/60000)
  const s = Math.floor((ms%60000)/1000)
  return [h,m,s].map(v=>String(v).padStart(2,'0')).join(':')
}

async function fetchNewsForTopic(topic, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: `You are a news curator. Search for the latest ${topic.label} news and return ONLY a JSON array with exactly 4 items. Each item: title (Korean preferred), summary (2 sentences max, Korean), source (string), url (string), publishedAt (string). Return ONLY valid JSON array. No markdown, no explanation.`,
      messages: [{ role: 'user', content: `Search the most important ${topic.label} (${topic.query}) news from the last 24 hours. Return JSON array, 4 items, summaries in Korean.` }]
    })
  })
  if (!res.ok) { const err = await res.json().catch(()=>({})); throw new Error(err?.error?.message || `HTTP ${res.status}`) }
  const data = await res.json()
  const text = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('')
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('응답에서 뉴스 데이터를 파싱하지 못했습니다.')
  return JSON.parse(match[0])
}
function Spinner({ size=14, color='#fff' }) {
  const ref = useRef(null)
  useEffect(() => {
    let angle = 0
    const id = setInterval(() => { angle = (angle+30)%360; if (ref.current) ref.current.style.transform = `rotate(${angle}deg)` }, 80)
    return () => clearInterval(id)
  }, [])
  const b = Math.max(1, size/6)
  return <span ref={ref} style={{ display:'inline-block', width:size, height:size, border:`${b}px solid ${color}30`, borderTopColor:color, borderRadius:'50%', flexShrink:0 }} />
}

function NewsCard({ item, index, color }) {
  const [open, setOpen] = useState(false)
  return (
    <div onClick={() => setOpen(v=>!v)} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.055)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderLeft:`3px solid ${color}`, borderRadius:8, padding:'15px 14px', cursor:'pointer', transition:'background 0.2s' }}>
      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
        <span style={{ minWidth:22, height:22, borderRadius:4, background:`${color}22`, border:`1px solid ${color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color, fontWeight:700, marginTop:1, flexShrink:0 }}>{String(index+1).padStart(2,'0')}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:'0 0 6px', fontSize:13, fontWeight:600, color:'#E8EDF5', lineHeight:1.45 }}>{item.title}</p>
          {open && <p style={{ margin:'0 0 8px', fontSize:11, color:'#8892A4', lineHeight:1.65 }}>{item.summary}</p>}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:4 }}>
            <span style={{ fontSize:9, color:'#8892A4' }}>{item.source} · {item.publishedAt}</span>
            {item.url && item.url !== '#' && <a href={item.url} target='_blank' rel='noopener noreferrer' onClick={e=>e.stopPropagation()} style={{ fontSize:9, color, textDecoration:'none', opacity:0.8 }}>원문 →</a>}
          </div>
        </div>
      </div>
    </div>
  )
}

function Skeleton({ color }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderLeft:`3px solid ${color}40`, borderRadius:8, padding:15 }}>
          <div style={{ display:'flex', gap:10 }}>
            <div style={{ width:22, height:22, borderRadius:4, background:'rgba(255,255,255,0.06)' }} />
            <div style={{ flex:1 }}>
              <div style={{ height:12, background:'rgba(255,255,255,0.06)', borderRadius:3, marginBottom:8, width:`${72+i*6}%` }} />
              <div style={{ height:9, background:'rgba(255,255,255,0.04)', borderRadius:3, width:'38%' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ topic, onFetch }) {
  return (
    <div style={{ border:'1px dashed rgba(255,255,255,0.1)', borderRadius:10, padding:'38px 20px', textAlign:'center' }}>
      <div style={{ fontSize:28, marginBottom:12 }}>📡</div>
      <p style={{ fontSize:12, color:'#8892A4', marginBottom:16 }}>{topic.label} 뉴스를 아직 수집하지 않았습니다</p>
      <button onClick={onFetch} style={{ background:`rgba(${hexToRgb(topic.color)},0.12)`, border:`1px solid ${topic.color}50`, borderRadius:6, padding:'8px 18px', cursor:'pointer', fontSize:11, color:topic.color, fontFamily:'inherit', letterSpacing:'0.05em' }}>지금 수집하기</button>
    </div>
  )
}

function ApiKeyModal({ onSave }) {
  const [key, setKey] = useState('')
  const valid = key.startsWith('sk-')
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:16 }}>
      <div style={{ background:'#0D1525', border:'1px solid rgba(0,212,255,0.25)', borderRadius:12, padding:'28px 24px', maxWidth:460, width:'100%' }}>
        <div style={{ fontSize:9, color:'#00D4FF', letterSpacing:'0.2em', marginBottom:8 }}>SIGNAL // SETUP</div>
        <h2 style={{ fontSize:16, color:'#fff', marginBottom:10 }}>Anthropic API 키 입력</h2>
        <p style={{ fontSize:11, color:'#8892A4', lineHeight:1.7, marginBottom:18 }}>뉴스 수집에 Claude API가 필요합니다.<br />키는 이 기기의 localStorage에만 저장됩니다.<br /><br />키 발급: <a href='https://console.anthropic.com/settings/keys' target='_blank' rel='noopener noreferrer' style={{ color:'#00D4FF' }}>console.anthropic.com</a></p>
        <input type='password' placeholder='sk-ant-...' value={key} onChange={e=>setKey(e.target.value)} onKeyDown={e=>e.key==='Enter' && valid && onSave(key)} style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:6, padding:'10px 12px', fontSize:12, color:'#E8EDF5', fontFamily:'inherit', outline:'none', marginBottom:12 }} />
        <button onClick={() => valid && onSave(key)} disabled={!valid} style={{ width:'100%', background:'rgba(0,212,255,0.15)', border:'1px solid rgba(0,212,255,0.35)', borderRadius:6, padding:10, fontSize:12, color:'#00D4FF', fontFamily:'inherit', cursor:valid?'pointer':'not-allowed', letterSpacing:'0.05em', opacity:valid?1:0.5 }}>저장하고 시작하기 →</button>
        <p style={{ marginTop:10, fontSize:10, color:'#555' }}>※ API 사용 요금이 발생할 수 있습니다 (매우 소량)</p>
      </div>
    </div>
  )
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(APIKEY_KEY)||'')
  const [activeTab, setActiveTab] = useState('ai')
  const [news, setNews] = useState(() => { try { const d=JSON.parse(localStorage.getItem(NEWS_KEY)||'{}'); delete d._ts; return d } catch { return {} } })
  const [loading, setLoading] = useState({})
  const [errors, setErrors] = useState({})
  const [lastFetched, setLastFetched] = useState(() => { try { return JSON.parse(localStorage.getItem(NEWS_KEY)||'{}')._ts||null } catch { return null } })
  const [countdown, setCountdown] = useState('')
  const [alarmOn, setAlarmOn] = useState(false)
  const [fetchingAll, setFetchingAll] = useState(false)

  useEffect(() => { const tick = () => setCountdown(formatCountdown(getNextAlarm()-new Date())); tick(); const id = setInterval(tick, 1000); return () => clearInterval(id) }, [])
  useEffect(() => { if (!alarmOn) return; const id = setInterval(() => { const now = new Date(); if (now.getHours()===7 && now.getMinutes()===0 && now.getSeconds()<5) fetchAll() }, 1000); return () => clearInterval(id) }, [alarmOn])

  const saveApiKey = k => { localStorage.setItem(APIKEY_KEY, k); setApiKey(k) }
  const fetchTopic = useCallback(async topicId => {
    const topic = TOPICS.find(t=>t.id===topicId); if (!topic) return
    setLoading(p=>({...p,[topicId]:true})); setErrors(p=>({...p,[topicId]:null}))
    try {
      const items = await fetchNewsForTopic(topic, apiKey)
      setNews(prev => { const updated = {...prev,[topicId]:items}; const ts = new Date().toISOString(); setLastFetched(ts); localStorage.setItem(NEWS_KEY, JSON.stringify({...updated,_ts:ts})); return updated })
    } catch(e) { setErrors(p=>({...p,[topicId]:e.message||'뉴스를 가져오지 못했습니다.'}))
    } finally { setLoading(p=>({...p,[topicId]:false})) }
  }, [apiKey])
  const fetchAll = useCallback(async () => { setFetchingAll(true); for (const t of TOPICS) await fetchTopic(t.id); setFetchingAll(false) }, [fetchTopic])

  const activeTopic = TOPICS.find(t=>t.id===activeTab)
  const activeNews = news[activeTab]||[]
  const isLoading = loading[activeTab]
  const error = errors[activeTab]

  if (!apiKey) return <ApiKeyModal onSave={saveApiKey} />

  return (
    <div style={{ minHeight:'100vh', background:'#090E1A', color:'#E8EDF5', fontFamily:"'IBM Plex Mono','Courier New',monospace" }}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,212,255,0.012) 2px,rgba(0,212,255,0.012) 4px)' }} />
      <div style={{ position:'relative', zIndex:1, maxWidth:760, margin:'0 auto', padding:'24px 16px 40px' }}>
        <div style={{ borderBottom:'1px solid rgba(0,212,255,0.18)', paddingBottom:20, marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <div>
              <div style={{ fontSize:9, letterSpacing:'0.3em', color:'#00D4FF', marginBottom:5 }}>SIGNAL // DAILY BRIEFING</div>
              <h1 style={{ margin:0, fontSize:26, fontWeight:700, letterSpacing:'-0.02em', color:'#fff', lineHeight:1.2 }}>AI·반도체<br />뉴스 브리핑</h1>
            </div>
            <div style={{ background:'rgba(0,212,255,0.05)', border:'1px solid rgba(0,212,255,0.15)', borderRadius:8, padding:'12px 16px', textAlign:'right' }}>
              <div style={{ fontSize:9, color:'#00D4FF', letterSpacing:'0.18em', marginBottom:5 }}>다음 브리핑까지</div>
              <div style={{ fontSize:22, fontWeight:700, color:'#fff', letterSpacing:'0.1em' }}>{countdown}</div>
              <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>
                <span style={{ fontSize:9, color:'#8892A4' }}>매일 07:00 자동수집</span>
                <button onClick={()=>setAlarmOn(v=>!v)} style={{ background:alarmOn?'rgba(0,212,255,0.18)':'rgba(255,255,255,0.05)', border:`1px solid ${alarmOn?'#00D4FF':'rgba(255,255,255,0.1)'}`, borderRadius:20, padding:'3px 10px', cursor:'pointer', fontSize:9, color:alarmOn?'#00D4FF':'#8892A4', letterSpacing:'0.1em', fontFamily:'inherit' }}>{alarmOn?'ON':'OFF'}</button>
              </div>
            </div>
          </div>
          <div style={{ marginTop:16, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
            <span style={{ fontSize:10, color:'#8892A4' }}>{lastFetched ? `마지막 수집: ${new Date(lastFetched).toLocaleString('ko-KR')}` : '아직 수집된 뉴스가 없습니다'}</span>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={fetchAll} disabled={fetchingAll} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.28)', borderRadius:6, padding:'7px 14px', cursor:fetchingAll?'not-allowed':'pointer', fontSize:11, color:'#00D4FF', fontFamily:'inherit', letterSpacing:'0.04em', opacity:fetchingAll?0.6:1 }}>
                {fetchingAll ? <><Spinner size={10} color='#00D4FF' /> 수집 중...</> : '⟳ 전체 수집'}
              </button>
              <button onClick={()=>{localStorage.removeItem(APIKEY_KEY);setApiKey('')}} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'7px 10px', cursor:'pointer', fontSize:10, color:'#8892A4', fontFamily:'inherit' }}>🔑</button>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          {TOPICS.map(t => (
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ flex:1, padding:'10px 0', background:activeTab===t.id?`rgba(${hexToRgb(t.color)},0.14)`:'rgba(255,255,255,0.03)', border:`1px solid ${activeTab===t.id?t.color:'rgba(255,255,255,0.08)'}`, borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600, color:activeTab===t.id?t.color:'#8892A4', letterSpacing:'0.07em', fontFamily:'inherit', transition:'all 0.2s', position:'relative' }}>
              {t.label}
              {(news[t.id]||[]).length>0 && <span style={{ position:'absolute', top:5, right:5, width:5, height:5, borderRadius:'50%', background:t.color, opacity:0.85 }} />}
            </button>
          ))}
        </div>
        <div style={{ marginBottom:18, display:'flex', justifyContent:'flex-end' }}>
          <button onClick={()=>fetchTopic(activeTab)} disabled={isLoading} style={{ display:'flex', alignItems:'center', gap:6, background:'transparent', border:`1px solid ${activeTopic.color}44`, borderRadius:6, padding:'6px 12px', cursor:isLoading?'not-allowed':'pointer', fontSize:10, color:activeTopic.color, fontFamily:'inherit', letterSpacing:'0.04em', opacity:isLoading?0.5:1 }}>
            {isLoading ? <><Spinner size={9} color={activeTopic.color} /> 수집 중...</> : `${activeTopic.label} 뉴스 수집`}
          </button>
        </div>
        {error && <div style={{ background:'rgba(255,80,80,0.08)', border:'1px solid rgba(255,80,80,0.2)', borderRadius:8, padding:'13px 15px', marginBottom:16, fontSize:11, color:'#FF7070' }}>⚠ {error}</div>}
        {isLoading && activeNews.length===0 && <Skeleton color={activeTopic.color} />}
        {!isLoading && activeNews.length===0 && !error && <EmptyState topic={activeTopic} onFetch={()=>fetchTopic(activeTab)} />}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {activeNews.map((item,i) => <NewsCard key={i} item={item} index={i} color={activeTopic.color} />)}
        </div>
        <div style={{ marginTop:36, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.05)', textAlign:'center' }}>
          <p style={{ fontSize:9, color:'#8892A4', letterSpacing:'0.15em' }}>POWERED BY CLAUDE AI · WEB SEARCH · {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  )
}
