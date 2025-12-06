import { Mixpanel } from 'mixpanel-react-native';

const MIXPANEL_TOKEN = '95947a142c409e8e0629ddc51da70e6d';

class Analytics {
  private mixpanel: Mixpanel | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  async init() {
    // Return existing init promise if already initializing
    if (this.initPromise) return this.initPromise;
    
    // Already initialized
    if (this.initialized) return Promise.resolve();
    
    this.initPromise = (async () => {
      try {
        console.log('🔄 Initializing Mixpanel with token:', MIXPANEL_TOKEN);
        
        // Create Mixpanel instance
        const trackAutomaticEvents = true;
        this.mixpanel = new Mixpanel(MIXPANEL_TOKEN, trackAutomaticEvents);
        
        // Initialize with EU server URL
        await this.mixpanel.init(
          false,  // optOutTrackingDefault
          {},
          'https://api-eu.mixpanel.com'  // serverURL for EU data residency
        );
        
        this.initialized = true;
        console.log('✅ Mixpanel initialized successfully');
        
        this.mixpanel.flush();
        console.log('🧪 Test event sent and flushed');
      } catch (error) {
        console.error('❌ Mixpanel init failed:', error);
        throw error;
      }
    })();
    
    return this.initPromise;
  }

  // Identify user
  async identify(userId: string, traits?: Record<string, any>) {
    await this.init();
    if (!this.mixpanel) {
      console.warn('⚠️ Mixpanel not initialized, cannot identify');
      return;
    }
    
    console.log('👤 Identifying user:', userId);
    this.mixpanel.identify(userId);
    
    if (traits) {
      this.mixpanel.getPeople().set(traits);
      console.log('📝 Set user properties:', traits);
    }
    
    // Flush immediately
    this.mixpanel.flush();
    console.log('📤 User identification flushed');
  }

  // Track event
  async track(eventName: string, properties?: Record<string, any>) {
    await this.init();
    if (!this.mixpanel) {
      console.warn('⚠️ Mixpanel not initialized, cannot track:', eventName);
      return;
    }
    
    console.log('📊 Tracking event:', eventName, properties || {});
    this.mixpanel.track(eventName, properties);
    
    // Flush immediately to ensure events are sent right away (for debugging)
    this.mixpanel.flush();
  }

  // Set user properties
  async setUserProperties(properties: Record<string, any>) {
    await this.init();
    if (!this.mixpanel) {
      console.warn('⚠️ Mixpanel not initialized, cannot set properties');
      return;
    }
    
    this.mixpanel.getPeople().set(properties);
    console.log('📝 Set user properties:', properties);
  }

  // Increment user property
  async incrementProperty(property: string, by: number = 1) {
    await this.init();
    if (!this.mixpanel) {
      console.warn('⚠️ Mixpanel not initialized, cannot increment');
      return;
    }
    
    this.mixpanel.getPeople().increment(property, by);
    console.log('➕ Incremented:', property, 'by', by);
  }

  // Reset on logout
  async reset() {
    await this.init();
    if (!this.mixpanel) {
      console.warn('⚠️ Mixpanel not initialized, cannot reset');
      return;
    }
    
    console.log('🔄 Resetting Mixpanel');
    this.mixpanel.reset();
  }

  // Flush events (force send)
  async flush() {
    await this.init();
    if (!this.mixpanel) return;
    
    console.log('📤 Flushing Mixpanel events');
    this.mixpanel.flush();
  }

}

export const analytics = new Analytics();

// Event names (keep consistent)
export const Events = {
  // Auth
  SIGN_IN: 'Sign In',
  SIGN_OUT: 'Sign Out',
  
  // Onboarding
  ONBOARDING_STARTED: 'Onboarding Started',
  ONBOARDING_COMPLETED: 'Onboarding Completed',
  
  // Tasks
  TASK_CREATED: 'Task Created',
  TASK_COMPLETED: 'Task Completed',
  TASK_DELETED: 'Task Deleted',
  TASK_EDITED: 'Task Edited',
  
  // Focus Sessions
  SESSION_STARTED: 'Session Started',
  SESSION_COMPLETED: 'Session Completed',
  SESSION_CANCELLED: 'Session Cancelled',
  
  // Trip Selection
  TRIP_MODAL_OPENED: 'Trip Modal Opened',
  TRIP_SELECTED: 'Trip Selected',
  TASK_SELECTED_FOR_SESSION: 'Task Selected for Session',

  
  // Profile
  PROFILE_VIEWED: 'Profile Viewed',
  PROFILE_NAME_UPDATED: 'Profile Name Updated',
  
  
  // Subscription (future)
  PAYWALL_VIEWED: 'Paywall Viewed',
  PAYWALL_CLOSED: 'Paywall Closed',
  SUBSCRIPTION_STARTED: 'Subscription Started',
  
  // Notifications
  DAILY_NOTIFICATION_SETTINGS_UPDATED: 'Daily Notification Settings Updated',
  
  // Screen Views
  SCREEN_VIEW: 'Screen View',
  
  // App Lifecycle
  APP_OPENED: 'App Opened',
  APP_BACKGROUNDED: 'App Backgrounded',
};

// Property names
export const Properties = {
  // User
  USER_ID: 'user_id',
  EMAIL: 'email',
  NAME: 'name',
  SIGNUP_DATE: 'signup_date',
  
  // Session
  DURATION_SECONDS: 'duration_seconds',
  DURATION_MINUTES: 'duration_minutes',
  SESSION_STATUS: 'session_status',
  TRIP_ID: 'trip_id',
  TRIP_NAME: 'trip_name',
  TRIP_DESTINATION: 'trip_destination',
  DISTANCE_KM: 'distance_km',
  TASKS_COUNT: 'tasks_count',
  TASKS_COMPLETED: 'tasks_completed',
  
  // Task
  TASK_ID: 'task_id',
  TASK_TITLE: 'task_title',
  TASK_PRIORITY: 'task_priority',
  TASK_STATUS: 'task_status',
  
  // Stats
  TOTAL_SESSIONS: 'total_sessions',
  TOTAL_MINUTES: 'total_minutes',
  TOTAL_DISTANCE_KM: 'total_distance_km',
  
  // Screen
  SCREEN_NAME: 'screen_name',
  
  // Subscription
  PLAN_TYPE: 'plan_type',
};
