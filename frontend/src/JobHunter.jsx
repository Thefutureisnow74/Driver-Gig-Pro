import React, { useState, useMemo } from 'react';
import { C, ALL_SERVICES, ALL_VEHICLES, ALL_STATES } from './theme';
import { BtnPrimary, BtnSecondary } from './components';

const API = process.env.REACT_APP_BACKEND_URL;

const SEARCH_SOURCES = ['Craigslist', 'Indeed', 'CBDriver.com', 'Google Search', 'LinkedIn', 'Other'];
const POPULAR_STATES = ['TX','CA','FL','NY','IL','GA','AZ','NC','OH','PA','WA','CO','TN','NV','OR','VA','MA','MN','WI','MO','IN','NJ','MI','MD'];

// State abbreviation → full name
const STATE_NAMES = { AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'Washington DC' };

// Service type → short aliases for keyword templates
const SVC_ALIASES = {
  'Package/Parcel Delivery': ['package delivery','parcel delivery','last mile delivery'],
  'Medical/Pharmacy (Rx)': ['medical courier','pharmacy delivery','Rx delivery'],
  'Food Delivery': ['food delivery','restaurant delivery','meal delivery'],
  'Job Board/Contract Platform': ['gig platform','contract platform','delivery job board'],
  'Freight (Non-CDL)': ['freight','non-CDL freight','hotshot delivery'],
  'Field Photography/Gig Tasks': ['field photography','gig tasks','mystery shopping'],
  'Grocery Delivery': ['grocery delivery','grocery courier','same day grocery'],
  'NEMT/Senior Transport': ['NEMT','senior transport','medical transport'],
  'Catering Delivery': ['catering delivery','catering courier','event delivery'],
  'Vehicle Transport': ['vehicle transport','auto transport','car hauling'],
  'Blood/Specimen/Lab Courier': ['blood courier','specimen courier','lab courier'],
  'Rideshare': ['rideshare','ride-hailing','passenger transport'],
  'Moving/Hauling': ['moving','hauling','junk removal'],
  'Pet Transport': ['pet transport','pet delivery','animal transport'],
  'Auto Parts/Automotive': ['auto parts delivery','automotive delivery','parts courier'],
  'Newspaper/Publication': ['newspaper delivery','publication delivery','paper route'],
  'Laundry/Dry Cleaning': ['laundry delivery','dry cleaning pickup','laundry courier'],
  'Child Transport': ['child transport','kid transport','school transport'],
  'Document/Legal Courier': ['document courier','legal courier','process serving'],
  'Organ/Tissue Transport': ['organ transport','tissue courier','medical specimen'],
  'Construction/Building Supply': ['construction delivery','building supply','material delivery'],
  'Floral/Perishable': ['flower delivery','floral courier','perishable delivery'],
  'Alcohol Delivery': ['alcohol delivery','liquor delivery','beer delivery'],
  'Cannabis Delivery': ['cannabis delivery','marijuana delivery','dispensary delivery'],
  'E-commerce Returns/Reverse Logistics': ['e-commerce returns','reverse logistics','return pickup'],
  'Marine/Waterway Delivery': ['marine delivery','boat delivery','waterway courier'],
};

// Vehicle short labels
const VEH_SHORT = { 'Car': 'car', 'SUV': 'SUV', 'Minivan': 'minivan', 'Pickup Truck': 'pickup truck', 'Cargo Van': 'cargo van', 'Box Truck': 'box truck', 'Semi-Truck': 'semi truck', 'Aircraft': 'aircraft', 'Bike / Scooter': 'bike' };

function buildSuggestions(serviceTypes, vehicles, states) {
  if (serviceTypes.length === 0) return [];
  const suggestions = [];
  const seen = new Set();
  const add = (text, cat) => {
    const key = text.toLowerCase();
    if (!seen.has(key)) { seen.add(key); suggestions.push({ text, cat }); }
  };

  const svcList = serviceTypes;
  const vehList = vehicles.length > 0 ? vehicles.map(v => VEH_SHORT[v] || v.toLowerCase()) : [];
  const stList = states.length > 0 ? states : [];
  const stateNames = stList.map(s => STATE_NAMES[s] || s);

  // ── Service + Location combos ──
  svcList.forEach(svc => {
    const aliases = SVC_ALIASES[svc] || [svc.toLowerCase()];
    const primary = aliases[0];

    // Base keywords per service
    add(`"${primary}" independent contractor companies`, 'Service Match');
    add(`"${primary}" 1099 driver companies hiring`, 'Service Match');
    add(`"${primary}" IC driver sign up`, 'Service Match');
    if (aliases[1]) add(`"${aliases[1]}" independent contractor opportunities`, 'Service Match');

    // Service + State
    stList.forEach((st, i) => {
      add(`"${primary}" driver ${stateNames[i] || st}`, 'Location Match');
      add(`"${primary}" independent contractor ${st}`, 'Location Match');
      add(`"${primary}" companies hiring ${stateNames[i] || st}`, 'Location Match');
    });

    // Service + Vehicle
    vehList.forEach(veh => {
      add(`"${primary}" ${veh} driver independent contractor`, 'Vehicle Match');
      add(`"${primary}" ${veh} gig companies`, 'Vehicle Match');
    });

    // Service + Vehicle + State (triple combo)
    if (vehList.length > 0 && stList.length > 0) {
      vehList.slice(0, 2).forEach(veh => {
        stList.slice(0, 3).forEach((st, i) => {
          add(`"${primary}" ${veh} driver ${stateNames[i] || st}`, 'Best Match');
        });
      });
    }
  });

  // ── General IC (always show) ──
  add('"1099 delivery driver" companies hiring', 'General');
  add('"IC delivery driver" companies list 2025 2026', 'General');
  add('"companies like amazon flex" alternatives', 'General');
  add('"own vehicle delivery" contract companies', 'General');
  add('"delivery contractor" companies "sign up"', 'General');
  add('"courier companies hiring independent contractors"', 'General');

  // ── Vehicle-specific ──
  vehList.forEach(veh => {
    add(`"${veh}" delivery gig companies`, 'Vehicle Match');
    add(`"${veh}" independent contractor routes`, 'Vehicle Match');
    if (veh === 'cargo van') { add('"cargo van routes" independent contractor', 'Vehicle Match'); add('"sprinter van" delivery contracts', 'Vehicle Match'); }
    if (veh === 'box truck') { add('"box truck" independent contractor loads', 'Vehicle Match'); }
    if (veh === 'car') { add('"car required" delivery gig no CDL', 'Vehicle Match'); }
    if (veh === 'SUV') { add('"SUV delivery" gig companies', 'Vehicle Match'); add('"XL vehicle" delivery platform', 'Vehicle Match'); }
  });

  // ── Routes ──
  add('"delivery routes for sale" independent contractor', 'Routes');
  add('"FedEx ground" contracted routes', 'Routes');
  add('"Amazon DSP" alternatives independent', 'Routes');
  add('"dedicated delivery routes" 1099', 'Routes');
  if (serviceTypes.some(s => ['Freight (Non-CDL)','Package/Parcel Delivery'].includes(s))) {
    add('"linehaul" independent contractor opportunities', 'Routes');
    add('"middle mile" contractor delivery', 'Routes');
    add('"freight broker" independent contractor no CDL', 'Routes');
  }

  // ── Sign Up ──
  add('"sign up to deliver" independent contractor', 'Sign Up');
  add('"become a delivery driver" no experience', 'Sign Up');
  add('"apply to deliver" own vehicle', 'Sign Up');
  add('"driver onboarding" gig platform 2026', 'Sign Up');
  add('"instant approval" delivery app driver', 'Sign Up');
  add('"on demand delivery" driver app 2026', 'Sign Up');
  add('"delivery gig" no interview instant start', 'Sign Up');

  // ── Earnings ──
  add('"highest paying" delivery gig apps', 'Earnings');
  add('"best paying" courier companies independent contractor', 'Earnings');
  add('"delivery driver income" comparison', 'Earnings');
  add('"which delivery app pays the most" 2026', 'Earnings');

  // ── Community / Resources ──
  add('"best courier companies to work for" site:reddit.com', 'Community');
  add('r/couriersofreddit "what companies do you work for"', 'Community');
  add('"delivery driver" "which apps" site:reddit.com', 'Community');
  add('gigworker.com delivery platforms', 'Resources');
  add('entrecourier.com recommended companies', 'Resources');
  add('flexjobs.com independent contractor delivery', 'Resources');

  return suggestions;
}

const CAT_COLORS = {
  'Best Match': '#c62828', 'Service Match': '#1565c0', 'Location Match': '#00695c',
  'Vehicle Match': '#6a1b9a', 'General': '#37474f', 'Routes': '#e65100',
  'Sign Up': '#4527a0', 'Earnings': '#bf360c', 'Community': '#0277bd', 'Resources': '#37474f',
};

export default function JobHunter({ companies, setCompanies, activities, setActivities, user }) {
  const [step, setStep] = useState(1);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [states, setStates] = useState(['TX']);
  const [sources, setSources] = useState([]);
  const [showAllStates, setShowAllStates] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [customKeywords, setCustomKeywords] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [kwFilter, setKwFilter] = useState('');
  const [kwCat, setKwCat] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchUrls, setSearchUrls] = useState({});
  const [searchSummary, setSearchSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [outreach, setOutreach] = useState(null);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [autoPilot, setAutoPilot] = useState(false);
  const [tracker, setTracker] = useState({ searches: 0, added: 0, outreachSent: 0 });

  const toggle = (arr, set, v) => set(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  const toggleKw = (t) => setSelectedKeywords(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  // Dynamic keyword generation based on selections
  const suggestions = useMemo(() => buildSuggestions(serviceTypes, vehicles, states), [serviceTypes, vehicles, states]);

  // All keywords = suggestions + custom
  const allKeywords = useMemo(() => {
    const customEntries = customKeywords.map(t => ({ text: t, cat: 'Custom' }));
    return [...suggestions, ...customEntries];
  }, [suggestions, customKeywords]);

  const cats = useMemo(() => [...new Set(allKeywords.map(k => k.cat))], [allKeywords]);

  const visibleKws = allKeywords.filter(k => {
    if (kwCat && k.cat !== kwCat) return false;
    if (kwFilter && !k.text.toLowerCase().includes(kwFilter.toLowerCase())) return false;
    return true;
  });

  const selectAllVisible = () => {
    const texts = visibleKws.map(k => k.text);
    const allOn = texts.every(t => selectedKeywords.includes(t));
    if (allOn) setSelectedKeywords(p => p.filter(k => !texts.includes(k)));
    else setSelectedKeywords(p => [...new Set([...p, ...texts])]);
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !customKeywords.includes(trimmed) && !suggestions.some(s => s.text === trimmed)) {
      setCustomKeywords(p => [...p, trimmed]);
      setSelectedKeywords(p => [...p, trimmed]);
    }
    setCustomInput('');
  };

  const removeCustom = (kw) => {
    setCustomKeywords(p => p.filter(k => k !== kw));
    setSelectedKeywords(p => p.filter(k => k !== kw));
  };

  const allKwTexts = allKeywords.map(k => k.text);
  const selectedCount = selectedKeywords.filter(k => allKwTexts.includes(k)).length;

  // ── API Handlers ──
  const handleSearch = async () => {
    setLoading(true); setLoadingMsg('AI is scanning job boards and finding opportunities...'); setStep(2);
    try {
      const res = await fetch(`${API}/api/ai/search-jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service_types: serviceTypes, vehicles, states, sources, keywords: selectedKeywords.join('\n') }) });
      const data = await res.json();
      if (data.success && data.data) { setSearchResults(data.data.results || []); setSearchUrls(data.data.searchUrls || {}); setSearchSummary(data.data.summary || ''); }
    } catch (e) { console.error(e); }
    setLoading(false); setLoadingMsg(''); setTracker(p => ({ ...p, searches: p.searches + 1 }));
  };

  const handleAutoPilot = async () => {
    setLoading(true); setLoadingMsg('Auto-Pilot engaged — searching, ranking, and drafting outreach...'); setAutoPilot(true); setStep(2);
    try {
      const res = await fetch(`${API}/api/ai/auto-pilot`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service_types: serviceTypes, vehicles, states, sources, user_name: user?.name || '', user_info: user?.additionalInfo || '', keywords: selectedKeywords.join('\n') }) });
      const data = await res.json();
      if (data.success && data.data) { setSearchResults(data.data.results || []); setSearchUrls(data.data.searchUrls || {}); setSearchSummary(data.data.summary || ''); }
    } catch (e) { console.error(e); }
    setLoading(false); setLoadingMsg(''); setTracker(p => ({ ...p, searches: p.searches + 1 }));
  };

  const handleDraftOutreach = async (job) => {
    setSelectedJob(job); if (job.outreach) { setOutreach(job.outreach); setStep(3); return; }
    setOutreachLoading(true); setStep(3);
    try {
      const res = await fetch(`${API}/api/ai/draft-outreach`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job, user_name: user?.name || '', user_info: user?.additionalInfo || '', type: 'email' }) });
      const data = await res.json();
      if (data.success && data.data) setOutreach(data.data);
    } catch (e) { console.error(e); }
    setOutreachLoading(false);
  };

  const handleAddToCRM = (job) => {
    if (companies.find(c => c.name.toLowerCase() === job.company.toLowerCase())) { alert(`"${job.company}" already in CRM.`); return; }
    setCompanies(p => [{ id: 'jh_' + Date.now(), name: job.company, website: job.url || '', mainPhone: '', activeStates: states, workModel: job.workModel ? [job.workModel] : [], serviceType: serviceTypes.slice(0, 3), vehicles, status: '', priority: job.matchScore >= 85 ? 'High' : job.matchScore >= 60 ? 'Medium' : 'Low', handler: user?.name || 'Unassigned', followUp: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], signupUrl: job.url || '', notes: `Found via AI Job Hunter on ${job.source}. ${job.description || ''} Pay: ${job.payEstimate || 'N/A'}`, contactName: '', contactTitle: '', contactEmail: '', contactPhone: '', contactLinkedin: '', contactMethod: 'Email', vehicleOther: '', serviceOther: '', createdAt: new Date().toISOString().split('T')[0], lastModified: new Date().toISOString().split('T')[0] }, ...p]);
    setTracker(p => ({ ...p, added: p.added + 1 })); alert(`"${job.company}" added to CRM!`);
  };

  const handleLogOutreach = () => {
    if (!selectedJob || !outreach) return;
    const now = new Date();
    setActivities(p => [{ id: 'jho_' + Date.now(), companyId: '', companyName: selectedJob.company, type: 'Email', outcome: 'Sent', direction: 'Sent', status: 'Awaiting Reply', handler: user?.name || '', subject: outreach.subject || '', notes: outreach.body || '', dateTime: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), date: now.toISOString().split('T')[0], nextAction: outreach.followUpNote || '' }, ...p]);
    setTracker(p => ({ ...p, outreachSent: p.outreachSent + 1 })); alert('Outreach logged to Communications!');
    setStep(2); setOutreach(null); setSelectedJob(null);
  };

  const handleLogOutreachDirect = (job, od) => {
    if (!job || !od) return;
    const now = new Date();
    setActivities(p => [{ id: 'jho_' + Date.now(), companyId: '', companyName: job.company, type: 'Email', outcome: 'Sent', direction: 'Sent', status: 'Awaiting Reply', handler: user?.name || '', subject: od.subject || '', notes: od.body || '', dateTime: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), date: now.toISOString().split('T')[0], nextAction: od.followUpNote || '' }, ...p]);
  };

  const statesList = showAllStates ? ALL_STATES : POPULAR_STATES;

  // ── Styles ──
  const card = { background: '#fff', border: '1px solid #e8e4dc', borderRadius: 10, padding: '18px 22px', marginBottom: 12 };
  const label = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#888', marginBottom: 10, display: 'block' };
  const chipS = (on) => ({ display: 'inline-flex', alignItems: 'center', padding: '6px 13px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', userSelect: 'none', transition: 'all .15s', margin: '2px 3px', background: on ? C.navy : '#fff', color: on ? '#fff' : '#666', border: `1.5px solid ${on ? C.navy : '#ddd'}` });
  const stChip = (on) => ({ ...chipS(on), padding: '6px 9px', minWidth: 32, justifyContent: 'center', fontSize: 11 });

  // ── Step Indicator ──
  const Steps = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
      {[{ n: 1, l: 'Configure' }, { n: 2, l: 'Results' }, { n: 3, l: 'Outreach' }].map((s, i) => (
        <React.Fragment key={s.n}>
          <div onClick={() => { if (s.n <= step) setStep(s.n); }} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: s.n <= step ? 'pointer' : 'default' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: step === s.n ? C.navy : step > s.n ? '#4ecdc4' : '#e8e4dc', color: step >= s.n ? '#fff' : '#aaa', transition: 'all .2s' }}>{step > s.n ? '\u2713' : s.n}</div>
            <span style={{ fontSize: 13, fontWeight: step === s.n ? 700 : 500, color: step === s.n ? C.navy : step > s.n ? '#4ecdc4' : '#bbb' }}>{s.l}</span>
          </div>
          {i < 2 && <div style={{ width: 50, height: 2, background: step > s.n ? '#4ecdc4' : '#e8e4dc', margin: '0 10px', borderRadius: 2 }} />}
        </React.Fragment>
      ))}
    </div>
  );

  // ─────────────────── STEP 1: SETUP ───────────────────
  const SetupStep = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {/* LEFT COLUMN */}
      <div>
        <div style={card}>
          <div style={label}>Service Types</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {ALL_SERVICES.map(s => <span key={s} data-testid={`service-chip-${s}`} onClick={() => toggle(serviceTypes, setServiceTypes, s)} style={chipS(serviceTypes.includes(s))}>{s}</span>)}
          </div>
          {serviceTypes.length > 0 && <div style={{ marginTop: 8, fontSize: 10, color: '#aaa' }}>{serviceTypes.length} selected</div>}
        </div>
        <div style={card}>
          <div style={label}>Your Vehicles</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {ALL_VEHICLES.map(v => <span key={v} data-testid={`vehicle-chip-${v}`} onClick={() => toggle(vehicles, setVehicles, v)} style={chipS(vehicles.includes(v))}>{v}</span>)}
          </div>
        </div>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={label}>Target States</div>
            <span onClick={() => setShowAllStates(!showAllStates)} style={{ fontSize: 11, color: C.blue, cursor: 'pointer', fontWeight: 600, marginBottom: 10 }}>{showAllStates ? 'Popular only' : `All ${ALL_STATES.length}`}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {statesList.map(st => <span key={st} data-testid={`state-chip-${st}`} onClick={() => toggle(states, setStates, st)} style={stChip(states.includes(st))}>{st}</span>)}
          </div>
          {states.length > 0 && <div style={{ marginTop: 8, fontSize: 10, color: '#aaa' }}>{states.length} state{states.length > 1 ? 's' : ''}</div>}
        </div>
        <div style={card}>
          <div style={label}>Search Sources</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {SEARCH_SOURCES.map(src => <span key={src} data-testid={`source-chip-${src}`} onClick={() => toggle(sources, setSources, src)} style={chipS(sources.includes(src))}>{src}</span>)}
          </div>
        </div>
        {(tracker.searches > 0 || tracker.added > 0 || tracker.outreachSent > 0) && (
          <div data-testid="job-tracker" style={{ ...card, display: 'flex', gap: 20, alignItems: 'center', border: '1.5px solid #c5d0f0', background: '#f8f9ff' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>Session</div>
            {[{ n: tracker.searches, l: 'Searches', c: C.navy }, { n: tracker.added, l: 'CRM Adds', c: '#2e7d32' }, { n: tracker.outreachSent, l: 'Outreach', c: '#1565c0' }].map(t => (
              <div key={t.l} style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 800, color: t.c }}>{t.n}</div><div style={{ fontSize: 9, color: '#888', fontWeight: 600 }}>{t.l}</div></div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          <BtnPrimary data-testid="search-jobs-btn" onClick={handleSearch} style={{ padding: '10px 24px', fontSize: 13 }}>{loading ? 'Searching...' : 'Search Jobs'}</BtnPrimary>
          <button data-testid="auto-pilot-btn" onClick={handleAutoPilot} disabled={loading} style={{ padding: '10px 22px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', background: 'linear-gradient(135deg, #e8a030, #f0c060)', color: '#fff', opacity: loading ? 0.6 : 1, boxShadow: '0 2px 8px rgba(232,160,48,.25)' }}>Auto-Pilot</button>
        </div>
      </div>

      {/* RIGHT COLUMN — SMART KEYWORD SUGGESTIONS */}
      <div style={{ ...card, marginBottom: 0, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 160px)', position: 'sticky', top: 0 }}>
        {/* Header */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>Suggested Keywords</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                {selectedCount} of {allKeywords.length} selected
                {(serviceTypes.length > 0 || vehicles.length > 0 || states.length > 0) && (
                  <span style={{ color: '#e8a030', fontWeight: 600 }}>
                    {' '}based on {[serviceTypes.length > 0 && `${serviceTypes.length} service${serviceTypes.length > 1 ? 's' : ''}`, vehicles.length > 0 && `${vehicles.length} vehicle${vehicles.length > 1 ? 's' : ''}`, states.length > 0 && `${states.length} state${states.length > 1 ? 's' : ''}`].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {selectedKeywords.length > 0 && <span data-testid="clear-all-kw" onClick={() => setSelectedKeywords([])} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: '#fce4ec', color: '#c62828', border: '1px solid #ef9a9a', cursor: 'pointer' }}>Clear</span>}
              <span data-testid="select-all-kw" onClick={selectAllVisible} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: '#e8f0fd', color: '#1565c0', border: '1px solid #a0b8f0', cursor: 'pointer' }}>
                {visibleKws.every(k => selectedKeywords.includes(k.text)) && visibleKws.length > 0 ? 'Deselect All' : 'Select All'}
              </span>
            </div>
          </div>
        </div>

        {/* Add Custom Keyword */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <input
            data-testid="custom-keyword-input"
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCustom(); }}
            placeholder="Add your own keyword and press Enter..."
            style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e2ddd6', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#faf8f5' }}
          />
          <button data-testid="add-custom-kw-btn" onClick={addCustom} disabled={!customInput.trim()} style={{ padding: '8px 14px', border: 'none', borderRadius: 8, background: customInput.trim() ? C.navy : '#e2ddd6', color: '#fff', fontSize: 12, fontWeight: 700, cursor: customInput.trim() ? 'pointer' : 'default', fontFamily: 'inherit', flexShrink: 0 }}>+ Add</button>
        </div>

        {/* Custom keywords display */}
        {customKeywords.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #f0ece4' }}>
            {customKeywords.map((kw, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px 4px 10px', borderRadius: 16, fontSize: 10, fontWeight: 600, background: selectedKeywords.includes(kw) ? '#4527a0' + '15' : '#f5f0e6', color: '#4527a0', border: '1px solid #4527a0' + '40', cursor: 'pointer' }} onClick={() => toggleKw(kw)}>
                <input type="checkbox" checked={selectedKeywords.includes(kw)} onChange={() => toggleKw(kw)} style={{ width: 12, height: 12, accentColor: '#4527a0', cursor: 'pointer', margin: 0 }} />
                <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kw}</span>
                <span onClick={e => { e.stopPropagation(); removeCustom(kw); }} style={{ width: 14, height: 14, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, background: '#4527a0' + '20', color: '#4527a0', cursor: 'pointer', flexShrink: 0 }} onMouseEnter={e => { e.currentTarget.style.background = '#c62828'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.background = '#4527a0' + '20'; e.currentTarget.style.color = '#4527a0'; }}>x</span>
              </span>
            ))}
          </div>
        )}

        {/* Filter + Category Tabs */}
        <input data-testid="keyword-filter" value={kwFilter} onChange={e => setKwFilter(e.target.value)} placeholder="Filter suggestions..." style={{ width: '100%', padding: '7px 12px', border: '1.5px solid #e2ddd6', borderRadius: 8, fontSize: 11, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8, background: '#faf8f5' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f0ece4' }}>
          <span data-testid="kw-cat-all" onClick={() => setKwCat(null)} style={{ padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: !kwCat ? C.navy : '#f5f0e6', color: !kwCat ? '#fff' : '#777', border: `1px solid ${!kwCat ? C.navy : '#e2ddd6'}` }}>All ({allKeywords.length})</span>
          {cats.map(cat => {
            const cc = CAT_COLORS[cat] || '#555';
            const on = kwCat === cat;
            const total = allKeywords.filter(k => k.cat === cat).length;
            const sel = allKeywords.filter(k => k.cat === cat && selectedKeywords.includes(k.text)).length;
            return <span key={cat} data-testid={`kw-cat-${cat}`} onClick={() => setKwCat(p => p === cat ? null : cat)} style={{ padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: on ? cc : '#f5f0e6', color: on ? '#fff' : '#777', border: `1px solid ${on ? cc : '#e2ddd6'}`, transition: 'all .12s' }}>{cat} ({sel}/{total})</span>;
          })}
        </div>

        {/* Keyword Checklist */}
        <div data-testid="keyword-checklist" style={{ flex: 1, overflowY: 'auto', marginRight: -6, paddingRight: 6 }}>
          {serviceTypes.length === 0 && customKeywords.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', height: '100%' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0ece4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#bbb', marginBottom: 14 }}>?</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Select Service Types to Begin</div>
              <div style={{ fontSize: 12, color: '#999', lineHeight: 1.6, maxWidth: 280 }}>Keywords are generated based on your Service Types, Vehicles, and Target States. Select at least one service type on the left to see suggestions.</div>
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 14 }}>Or add your own keywords above.</div>
            </div>
          ) : (<>
          {cats.filter(cat => !kwCat || kwCat === cat).map(cat => {
            const catKws = visibleKws.filter(k => k.cat === cat);
            if (catKws.length === 0) return null;
            const cc = CAT_COLORS[cat] || '#555';
            const catTexts = allKeywords.filter(k => k.cat === cat).map(k => k.text);
            const allOn = catTexts.every(t => selectedKeywords.includes(t));
            return (
              <div key={cat} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: cc }}>{cat}</span>
                  <span style={{ fontSize: 10, color: '#bbb' }}>({catKws.length})</span>
                  <span onClick={() => { if (allOn) setSelectedKeywords(p => p.filter(k => !catTexts.includes(k))); else setSelectedKeywords(p => [...new Set([...p, ...catTexts])]); }} style={{ fontSize: 10, color: C.blue, cursor: 'pointer', fontWeight: 600, marginLeft: 'auto' }}>{allOn ? 'Deselect' : 'Select all'}</span>
                </div>
                {catKws.map((kw, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', transition: 'background .1s', marginBottom: 1, background: selectedKeywords.includes(kw.text) ? cc + '08' : 'transparent' }} onMouseEnter={e => { if (!selectedKeywords.includes(kw.text)) e.currentTarget.style.background = '#f8f6f2'; }} onMouseLeave={e => { e.currentTarget.style.background = selectedKeywords.includes(kw.text) ? cc + '08' : 'transparent'; }}>
                    <input type="checkbox" checked={selectedKeywords.includes(kw.text)} onChange={() => toggleKw(kw.text)} style={{ marginTop: 2, accentColor: cc, cursor: 'pointer', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: selectedKeywords.includes(kw.text) ? '#222' : '#555', lineHeight: 1.5, fontWeight: selectedKeywords.includes(kw.text) ? 600 : 400 }}>
                      {kwFilter ? highlightText(kw.text, kwFilter) : kw.text}
                    </span>
                  </label>
                ))}
              </div>
            );
          })}
          {visibleKws.length === 0 && serviceTypes.length > 0 && <div style={{ textAlign: 'center', padding: '20px 0', color: '#bbb', fontSize: 12 }}>No keywords match your filter</div>}
          </>
          )}
        </div>
      </div>
    </div>
  );

  // ─────────────────── STEP 2: RESULTS ───────────────────
  const ResultsStep = () => {
    const sc = { 'Indeed': { bg: '#e8f0fd', b: '#5b82e0', t: '#1a3a8b' }, 'Craigslist': { bg: '#e8f5e9', b: '#66bb6a', t: '#1b5e20' }, 'CBDriver.com': { bg: '#fff8e1', b: '#ffb74d', t: '#e65100' }, 'LinkedIn': { bg: '#e3f2fd', b: '#42a5f5', t: '#0d47a1' }, 'Google Search': { bg: '#fce4ec', b: '#ef5350', t: '#b71c1c' }, 'Google': { bg: '#fce4ec', b: '#ef5350', t: '#b71c1c' }, 'Other': { bg: '#f3e5f5', b: '#ab47bc', t: '#4a148c' } };
    const gc = (s) => sc[s] || sc.Other;
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{loading ? loadingMsg : `${searchResults.length} Opportunities Found`}</span>
            {searchSummary && !loading && <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>{searchSummary}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <BtnSecondary onClick={() => { setStep(1); setSearchResults([]); setAutoPilot(false); }}>Modify Search</BtnSecondary>
            <BtnPrimary onClick={handleSearch}>Refresh</BtnPrimary>
          </div>
        </div>
        {Object.keys(searchUrls).length > 0 && !loading && (
          <div style={{ ...card, padding: '12px 18px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Direct Search Links</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(searchUrls).map(([n, u]) => { const c = gc(n); return <a key={n} href={u} target="_blank" rel="noopener noreferrer" style={{ padding: '5px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600, background: c.bg, color: c.t, border: `1px solid ${c.b}`, textDecoration: 'none' }}>{n} &rarr;</a>; })}
            </div>
          </div>
        )}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ display: 'inline-block', width: 36, height: 36, border: '3px solid #e2ddd6', borderTopColor: C.navy, borderRadius: '50%', animation: 'jhspin 1s linear infinite' }} />
            <div style={{ marginTop: 14, fontSize: 13, color: '#888', fontWeight: 600 }}>{loadingMsg}</div>
            <style>{`@keyframes jhspin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {!loading && searchResults.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {searchResults.map((job, i) => {
              const c = gc(job.source);
              return (
                <div key={job.id || i} data-testid={`job-result-${job.id || i}`} style={{ ...card, padding: '16px 20px', marginBottom: 0, transition: 'all .15s', position: 'relative' }} onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,.07)'; e.currentTarget.style.borderColor = '#c5d0f0'; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e8e4dc'; }}>
                  {job.matchScore && <div style={{ position: 'absolute', top: 12, right: 14, width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, background: job.matchScore >= 85 ? '#e8f5e9' : job.matchScore >= 60 ? '#fff8e1' : '#fce4ec', color: job.matchScore >= 85 ? '#1b5e20' : job.matchScore >= 60 ? '#e65100' : '#c62828', border: `2px solid ${job.matchScore >= 85 ? '#66bb6a' : job.matchScore >= 60 ? '#ffb74d' : '#ef9a9a'}` }}>{job.matchScore}</div>}
                  <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 16, fontSize: 9, fontWeight: 700, background: c.bg, color: c.t, border: `1px solid ${c.b}`, marginBottom: 8 }}>{job.source}</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 2, paddingRight: 44 }}>{job.title}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>{job.company}</div>
                  <div style={{ display: 'flex', gap: 14, marginBottom: 8, fontSize: 11 }}>
                    {job.location && <span style={{ color: '#888' }}>{job.location}</span>}
                    {job.payEstimate && <span style={{ color: '#2e7d32', fontWeight: 700 }}>{job.payEstimate}</span>}
                    {job.workModel && <span style={{ color: '#666' }}>{job.workModel}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#555', lineHeight: 1.6, marginBottom: 8 }}>{job.description}</div>
                  {job.tags && job.tags.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>{job.tags.map((t, ti) => <span key={ti} style={{ padding: '2px 7px', borderRadius: 10, fontSize: 9, background: '#f5f0e6', color: '#666', border: '1px solid #e2ddd6' }}>{t}</span>)}</div>}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', borderTop: '1px solid #f0ece4', paddingTop: 10 }}>
                    <button data-testid={`add-crm-${job.id || i}`} onClick={() => handleAddToCRM(job)} style={{ padding: '5px 12px', border: '1.5px solid #4ecdc4', borderRadius: 6, background: '#fff', color: '#2a9d8f', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }} onMouseEnter={e => { e.currentTarget.style.background = '#4ecdc4'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#2a9d8f'; }}>+ CRM</button>
                    <button data-testid={`draft-outreach-${job.id || i}`} onClick={() => handleDraftOutreach(job)} style={{ padding: '5px 12px', border: `1.5px solid ${C.navy}`, borderRadius: 6, background: C.navy, color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Outreach</button>
                    {job.url && <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ padding: '5px 12px', border: '1.5px solid #ddd', borderRadius: 6, background: '#fff', color: '#555', fontSize: 10, fontWeight: 600, textDecoration: 'none', fontFamily: 'inherit' }}>Apply &rarr;</a>}
                    {job.postedDate && <span style={{ marginLeft: 'auto', fontSize: 9, color: '#bbb' }}>{job.postedDate}</span>}
                  </div>
                  {autoPilot && job.outreach && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: '#f8f9ff', border: '1px solid #c5d0f0', borderRadius: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.navy, marginBottom: 3 }}>AI Draft Ready</div>
                      <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>Subject: {job.outreach.subject}</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => handleDraftOutreach(job)} style={{ padding: '3px 8px', border: 'none', borderRadius: 4, background: C.navy, color: '#fff', fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Review</button>
                        <button onClick={() => { setSelectedJob(job); setOutreach(job.outreach); handleLogOutreachDirect(job, job.outreach); }} style={{ padding: '3px 8px', border: '1px solid #ddd', borderRadius: 4, background: '#fff', color: '#555', fontSize: 9, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Quick Log</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {!loading && searchResults.length === 0 && <div style={{ textAlign: 'center', padding: '50px 20px', color: '#bbb', fontSize: 14 }}>Configure your search and click "Search Jobs"</div>}
      </>
    );
  };

  // ─────────────────── STEP 3: OUTREACH ───────────────────
  const OutreachStep = () => (
    <>
      {selectedJob && (
        <div style={{ ...card, border: '1.5px solid #c5d0f0', background: '#f8f9ff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{selectedJob.title}</div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{selectedJob.company} — {selectedJob.location}</div>
              {selectedJob.payEstimate && <div style={{ fontSize: 11, color: '#2e7d32', fontWeight: 700, marginTop: 3 }}>{selectedJob.payEstimate}</div>}
            </div>
            <BtnSecondary onClick={() => { setStep(2); setOutreach(null); setSelectedJob(null); }}>Back</BtnSecondary>
          </div>
        </div>
      )}
      {outreachLoading && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ display: 'inline-block', width: 32, height: 32, border: '3px solid #e2ddd6', borderTopColor: C.navy, borderRadius: '50%', animation: 'jhspin 1s linear infinite' }} />
          <div style={{ marginTop: 10, fontSize: 12, color: '#888' }}>AI is drafting your outreach...</div>
          <style>{`@keyframes jhspin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {outreach && !outreachLoading && (
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 14 }}>AI-Drafted Outreach</div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#888', marginBottom: 4 }}>Subject</label>
            <input data-testid="outreach-subject" value={outreach.subject || ''} onChange={e => setOutreach(p => ({ ...p, subject: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#888', marginBottom: 4 }}>Message</label>
            <textarea data-testid="outreach-body" value={outreach.body || ''} onChange={e => setOutreach(p => ({ ...p, body: e.target.value }))} rows={10} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.7 }} />
          </div>
          {outreach.followUpNote && <div style={{ padding: '8px 12px', background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, marginBottom: 14 }}><span style={{ fontSize: 10, fontWeight: 700, color: '#e65100' }}>Follow-up: </span><span style={{ fontSize: 11, color: '#555' }}>{outreach.followUpNote}</span></div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, borderTop: '1px solid #f0ece4', paddingTop: 14 }}>
            <BtnPrimary data-testid="log-outreach-btn" onClick={handleLogOutreach} style={{ background: '#1565c0' }}>Log to Communications</BtnPrimary>
            <button onClick={() => { handleAddToCRM(selectedJob); handleLogOutreach(); }} style={{ padding: '8px 18px', border: 'none', borderRadius: 8, background: '#4ecdc4', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Add to CRM & Log</button>
            <button onClick={() => { navigator.clipboard.writeText(`Subject: ${outreach.subject}\n\n${outreach.body}`); alert('Copied!'); }} style={{ padding: '8px 18px', border: '1.5px solid #ddd', borderRadius: 8, background: '#fff', color: '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Copy</button>
            <BtnSecondary onClick={() => handleDraftOutreach(selectedJob)}>Regenerate</BtnSecondary>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div data-testid="job-hunter-page" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: C.cream }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: C.navy, letterSpacing: '-.5px' }}>AI Job Hunter</span>
          <span style={{ padding: '3px 10px', borderRadius: 16, fontSize: 10, fontWeight: 800, letterSpacing: '.4px', background: 'linear-gradient(135deg, #e8a030, #f0c060)', color: '#fff' }}>PREMIUM</span>
        </div>
        <div style={{ fontSize: 12, color: '#999' }}>Scan job boards, find contracts, draft outreach</div>
      </div>
      <Steps />
      {step === 1 && <SetupStep />}
      {step === 2 && <ResultsStep />}
      {step === 3 && <OutreachStep />}
    </div>
  );
}

function highlightText(text, q) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return <>{text.slice(0, idx)}<span style={{ background: '#fff3cd', fontWeight: 700, borderRadius: 2, padding: '0 1px' }}>{text.slice(idx, idx + q.length)}</span>{text.slice(idx + q.length)}</>;
}
