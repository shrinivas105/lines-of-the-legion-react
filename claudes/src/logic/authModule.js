// logic/authModule.js - Handles all authentication and progress sync logic
// Converted from auth.js — logic preserved verbatim, only module wiring changed
// (window.supabaseClient -> imported supabase client; global helpers -> imports)

import {
  supabase,
  signInWithGoogle,
  signOut,
  loadProgress,
  saveProgress,
} from '../services/supabaseClient';
import { syncPracticeOpeningsFromCloud } from '../services/practiceOpeningsStore';

export class AuthModule {
  constructor(app) {
    this.app = app;
    this.user = null;
    this.isLoggedIn = false;
    this.authInitialized = false;
  }

  async initialize() {
    try {
      if (!supabase) {
        console.error('Supabase client not found!');
        this.authInitialized = true;
        return false;
      }

      console.log('🔄 Initializing auth...');

      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));

      const error = urlParams.get('error') || hashParams.get('error');
      const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

      if (error) {
        console.error('❌ OAuth error in URL:', error, errorDescription);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      console.log('🔍 Checking for existing session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      console.log('📦 Session data:', session ? 'Session found' : 'No session', sessionError);

      if (sessionError) {
        console.error('❌ Session check error:', sessionError);
      }

      if (session && session.user) {
        this.user = session.user;
        this.isLoggedIn = true;
        console.log('✅ USER LOGGED IN:', this.user.email);

        if (urlParams.has('code') || urlParams.has('access_token')) {
          console.log('🔄 Cleaning OAuth params from URL');
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        await this.loadCloudProgress();
        await syncPracticeOpeningsFromCloud();
      } else {
        console.log('ℹ️ No active session - using local storage');
      }

      this.setupAuthListener();

      this.authInitialized = true;
      return true;
    } catch (e) {
      console.error('❌ Auth initialization error:', e);
      this.authInitialized = true;
      return false;
    }
  }

  setupAuthListener() {
    if (!supabase) {
      console.error('Cannot setup auth listener - supabase client not found');
      return;
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session?.user?.email || 'no user');

      if (event === 'INITIAL_SESSION' && this.isLoggedIn) {
        console.log('ℹ️ Skipping INITIAL_SESSION - already logged in');
        return;
      }

      const wasLoggedIn = this.isLoggedIn;
      this.user = session?.user ?? null;
      this.isLoggedIn = !!this.user;

      if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && this.isLoggedIn)) {
        if (!wasLoggedIn) {
          console.log('✓ User signed in, loading cloud data...');
          await this.loadCloudProgress();
          await syncPracticeOpeningsFromCloud();
          console.log('✓ Cloud data loaded, rendering app...');
          this.app.render();
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('✓ Token refreshed');
      } else if (event === 'SIGNED_OUT') {
        console.log('✓ User signed out');
        this.app.render();
      } else if (event === 'USER_UPDATED') {
        console.log('✓ User updated');
      }
    });
  }

  async loadCloudProgress() {
    try {
      console.log('📥 Attempting to load cloud progress...');

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Load timeout')), 10000)
      );

      const progress = await Promise.race([
        loadProgress(),
        timeoutPromise
      ]);

      if (progress) {
        console.log('✅ Cloud progress loaded:', progress);

        this.app.legionMerits = {
          master_merit: progress.master_merit || 0,
          lichess_merit: progress.lichess_merit || 0
        };

        if (typeof progress.games_played === 'number') {
          this.app.gamesPlayedMaster = (this.app.gamesPlayedMaster || 0) + progress.games_played;
          this.app.gamesPlayedLichess = this.app.gamesPlayedLichess || 0;
          console.log(`📊 Migrated ${progress.games_played} old games to Master legion`);
        }

        this.app.gamesPlayedMaster = progress.games_played_master ?? this.app.gamesPlayedMaster ?? 0;
        this.app.gamesPlayedLichess = progress.games_played_lichess ?? this.app.gamesPlayedLichess ?? 0;

        this.app.recentBattleRanksMaster = progress.recent_battle_ranks_master || [];
        this.app.recentBattleRanksLichess = progress.recent_battle_ranks_lichess || [];

        this.app.lastColorMaster = progress.last_color_master || null;
        this.app.lastColorLichess = progress.last_color_lichess || null;

        this.app.saveToLocalStorage();
      } else {
        console.log('ℹ️ No cloud progress found, uploading local...');
        await this.saveCloudProgress();
      }
    } catch (e) {
      console.error('❌ Error loading cloud progress:', e);
      console.log('⚠️ Falling back to local data');
    }
  }

  async saveCloudProgress() {
    if (!this.isLoggedIn) {
      console.log('ℹ️ Not logged in - skipping cloud save');
      return;
    }

    try {
      console.log('💾 Saving cloud progress...');

      const progress = {
        master_merit: this.app.legionMerits.master_merit || 0,
        lichess_merit: this.app.legionMerits.lichess_merit || 0,
        games_played_master: this.app.gamesPlayedMaster || 0,
        games_played_lichess: this.app.gamesPlayedLichess || 0,
        recent_battle_ranks_master: this.app.recentBattleRanksMaster || [],
        recent_battle_ranks_lichess: this.app.recentBattleRanksLichess || [],
        last_color_master: this.app.lastColorMaster || null,
        last_color_lichess: this.app.lastColorLichess || null
      };

      const result = await saveProgress(progress);

      if (result && result.success) {
        console.log('✅ Cloud save successful (new merit system)');
      } else {
        console.warn('⚠️ Cloud save issue:', result);
      }
    } catch (e) {
      console.error('❌ Error in saveCloudProgress:', e);
    }
  }

  async handleSignIn() {
    console.log('🔐 Sign in button clicked');
    await signInWithGoogle();
  }

  async handleSignOut() {
    await signOut();
    this.user = null;
    this.isLoggedIn = false;
    this.app.render();
  }
}

export default AuthModule;
