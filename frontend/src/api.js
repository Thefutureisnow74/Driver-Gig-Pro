import { supabase } from './supabaseClient';

const API = process.env.REACT_APP_BACKEND_URL;

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

async function req(method, path, body) {
  const token = await getToken();
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${API}${path}`, opts);
  if (r.status === 401) { throw new Error('UNAUTHORIZED'); }
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `Error ${r.status}`); }
  return r.json();
}

// ── snake_case <-> camelCase ──
function snakeToCamel(s) { return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }
function camelToSnake(s) { return s.replace(/[A-Z]/g, c => '_' + c.toLowerCase()); }

function mapKeys(obj, fn) {
  if (Array.isArray(obj)) return obj.map(v => mapKeys(v, fn));
  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[fn(k)] = mapKeys(v, fn);
    return out;
  }
  return obj;
}

function toCamel(obj) { return mapKeys(obj, snakeToCamel); }
function toSnake(obj) { return mapKeys(obj, camelToSnake); }

function companyFromApi(c) {
  const out = toCamel(c);
  if ('followUpDate' in out) { out.followUp = out.followUpDate; delete out.followUpDate; }
  if (!out.color) out.color = '#2563b8';
  return out;
}

function companyToApi(c) {
  const copy = { ...c };
  if ('followUp' in copy) { copy.followUpDate = copy.followUp; delete copy.followUp; }
  delete copy.color; delete copy.videos; delete copy.documents;
  return toSnake(copy);
}

function activityFromApi(a) {
  const out = toCamel(a);
  if (out.dateTime && !out.date) out.date = out.dateTime.split('T')[0];
  return out;
}

// ── Auth (Supabase) ──
export async function supabaseSignUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  if (error) throw error;
  return data;
}

export async function supabaseSignIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function supabaseSignOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function apiAuthMe() {
  return toCamel(await req('GET', '/api/auth/me'));
}

// ── Companies ──
export async function apiGetCompanies() {
  const list = await req('GET', '/api/companies');
  return list.map(companyFromApi);
}

export async function apiCreateCompany(data) {
  const body = companyToApi(data);
  const r = await req('POST', '/api/companies', body);
  return companyFromApi(r);
}

export async function apiUpdateCompany(id, data) {
  const body = companyToApi(data);
  delete body.id; delete body.user_id; delete body.created_at;
  const r = await req('PUT', `/api/companies/${id}`, body);
  return companyFromApi(r);
}

export async function apiDeleteCompany(id) {
  return req('DELETE', `/api/companies/${id}`);
}

// ── Activities ──
export async function apiGetActivities() {
  const list = await req('GET', '/api/activities');
  return list.map(activityFromApi);
}

export async function apiCreateActivity(data) {
  const body = toSnake(data);
  const r = await req('POST', '/api/activities', body);
  return activityFromApi(r);
}

// ── Settings ──
export async function apiGetHandlers() {
  return req('GET', '/api/settings/handlers');
}

export async function apiUpdateHandlers(handlers) {
  return req('PUT', '/api/settings/handlers', { handlers });
}

export async function apiRenameHandler(oldName, newName) {
  return req('PUT', '/api/settings/handlers/rename', { old_name: oldName, new_name: newName });
}

export async function apiGetProfile() {
  return toCamel(await req('GET', '/api/settings/profile'));
}

export async function apiUpdateProfile(data) {
  return req('PUT', '/api/settings/profile', toSnake(data));
}

// ── Dashboard ──
export async function apiGetDashboard() {
  return toCamel(await req('GET', '/api/dashboard'));
}

// ── Seed ──
export async function apiSeed() {
  return req('POST', '/api/seed');
}

// ── Earnings ──
export async function apiGetEarnings() {
  const list = await req('GET', '/api/earnings');
  return list.map(toCamel);
}

export async function apiGetEarningsSummary() {
  return toCamel(await req('GET', '/api/earnings/summary'));
}

// ── AI ──
export async function aiCompanyAutofill(companyName) {
  return req('POST', '/api/ai/company-autofill', { company_name: companyName });
}

export async function aiRecommendation(company) {
  return req('POST', '/api/ai/recommendation', toSnake(company));
}

export async function aiFollowupAnalysis(communications) {
  return req('POST', '/api/ai/followup-analysis', { communications });
}

export async function aiDraftEmail(data) {
  return req('POST', '/api/ai/draft-email', data);
}

export async function aiGenerateKeywords(data) {
  return req('POST', '/api/ai/generate-keywords', toSnake(data));
}

export async function aiSearchJobs(data) {
  return req('POST', '/api/ai/search-jobs', toSnake(data));
}

export async function aiDraftOutreach(data) {
  return req('POST', '/api/ai/draft-outreach', data);
}

export async function aiAutoPilot(data) {
  return req('POST', '/api/ai/auto-pilot', toSnake(data));
}

// ── Job Hunter ──
export async function apiSaveJob(data) {
  return toCamel(await req('POST', '/api/job-hunter/save', data));
}

export async function apiGetSavedJobs() {
  const list = await req('GET', '/api/job-hunter/saved');
  return list.map(toCamel);
}

export async function apiDeleteSavedJob(id) {
  return req('DELETE', `/api/job-hunter/saved/${id}`);
}

// ── Email ──
export async function apiSendEmail(data) {
  return req('POST', '/api/email/send', data);
}
