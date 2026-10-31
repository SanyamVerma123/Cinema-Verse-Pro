/**
 * CinemaVerse Pro — Supabase Service Integration
 * Handles User Auth, Session Auditing (Login & Logout timestamps),
 * and Cloud Watch History Sync.
 */

const { createClient } = require('@supabase/supabase-js');

const DEFAULT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const DEFAULT_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

let cachedClient = null;

function getSupabaseClient(url = DEFAULT_URL, anonKey = DEFAULT_ANON_KEY) {
  const targetUrl = url || DEFAULT_URL;
  const targetKey = anonKey || DEFAULT_ANON_KEY;

  if (!targetUrl || !targetKey) {
    return null;
  }

  if (cachedClient && cachedClient._supabaseUrl === targetUrl) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(targetUrl, targetKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    return cachedClient;
  } catch (err) {
    console.error('[Supabase] Failed to initialize client:', err.message);
    return null;
  }
}

/**
 * Record a user login event
 */
async function recordLoginSession(supabase, user, userAgent = '', ipAddress = '') {
  if (!supabase || !user) return null;
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        user_email: user.email,
        login_time: new Date().toISOString(),
        user_agent: userAgent,
        ip_address: ipAddress,
        is_active: true
      })
      .select('id, login_time, is_active')
      .single();

    if (error) {
      console.warn('[Supabase] Error recording login session:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[Supabase] Exception in recordLoginSession:', err);
    return null;
  }
}

/**
 * Record a user logout event with exact timestamp
 */
async function recordLogoutSession(supabase, sessionId) {
  if (!supabase || !sessionId) return false;
  try {
    const now = new Date();
    // First get login time to compute duration
    const { data: session } = await supabase
      .from('user_sessions')
      .select('login_time')
      .eq('id', sessionId)
      .single();

    let durationSeconds = null;
    if (session && session.login_time) {
      durationSeconds = Math.round((now.getTime() - new Date(session.login_time).getTime()) / 1000);
    }

    const { error } = await supabase
      .from('user_sessions')
      .update({
        logout_time: now.toISOString(),
        session_duration_seconds: durationSeconds,
        is_active: false,
        updated_at: now.toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      console.warn('[Supabase] Error recording logout session:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Exception in recordLogoutSession:', err);
    return false;
  }
}

/**
 * Fetch a user's session history (login and logout logs)
 */
async function getUserSessions(supabase, userId, limit = 20) {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('login_time', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Supabase] Error fetching user sessions:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[Supabase] Exception in getUserSessions:', err);
    return [];
  }
}

/**
 * Upsert a title into the user's cloud watch history
 */
async function saveWatchHistory(supabase, userId, itemData) {
  if (!supabase || !userId || !itemData || !itemData.media_id) return null;
  try {
    const now = new Date().toISOString();
    const payload = {
      user_id: userId,
      media_id: String(itemData.media_id),
      title: itemData.title || 'Untitled',
      type: itemData.type || 'movie',
      season: itemData.season || 1,
      episode: itemData.episode || 1,
      progress_seconds: Math.round(itemData.progress_seconds || itemData.currentTime || 0),
      duration_seconds: Math.round(itemData.duration_seconds || itemData.duration || 0),
      completed: !!itemData.completed,
      poster: itemData.poster || '',
      backdrop: itemData.backdrop || '',
      platform: itemData.platform || '',
      platform_id: itemData.platform_id || itemData.platformId || '',
      last_watched: now,
      updated_at: now
    };

    const { data, error } = await supabase
      .from('watch_history')
      .upsert(payload, { onConflict: 'user_id,media_id' })
      .select()
      .single();

    if (error) {
      console.warn('[Supabase] Error saving watch history:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[Supabase] Exception in saveWatchHistory:', err);
    return null;
  }
}

/**
 * Fetch a user's cloud watch history
 */
async function getUserWatchHistory(supabase, userId, limit = 50) {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('watch_history')
      .select('*')
      .eq('user_id', userId)
      .order('last_watched', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Supabase] Error fetching watch history:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[Supabase] Exception in getUserWatchHistory:', err);
    return [];
  }
}

module.exports = {
  getSupabaseClient,
  recordLoginSession,
  recordLogoutSession,
  getUserSessions,
  saveWatchHistory,
  getUserWatchHistory,
  DEFAULT_URL,
  DEFAULT_ANON_KEY
};
