/** GET /v2/user/profile/basic (scope: read:profile) */
export interface WhoopBasicProfile {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export type WhoopScoreState = "SCORED" | "PENDING_SCORE" | "UNSCORABLE";

/** GET /v2/activity/sleep (scope: read:sleep) */
export interface WhoopSleepRecord {
  id: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  /** e.g. "+05:30" or "-08:00" */
  timezone_offset: string;
  nap: boolean;
  score_state: WhoopScoreState;
  score?: {
    stage_summary?: {
      total_in_bed_time_milli?: number;
      total_awake_time_milli?: number;
      total_no_data_time_milli?: number;
      total_light_sleep_time_milli?: number;
      total_slow_wave_sleep_time_milli?: number;
      total_rem_sleep_time_milli?: number;
      sleep_cycle_count?: number;
      disturbance_count?: number;
    };
    sleep_needed?: Record<string, number>;
    respiratory_rate?: number;
    sleep_performance_percentage?: number;
    sleep_consistency_percentage?: number;
    sleep_efficiency_percentage?: number;
  } | null;
}

/** GET /v2/activity/workout (scope: read:workout) */
export interface WhoopWorkoutRecord {
  id: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  /** Not guaranteed - some v2 records carry only sport_name. */
  sport_id?: number | null;
  sport_name?: string | null;
  score_state: WhoopScoreState;
  score?: {
    strain?: number;
    average_heart_rate?: number;
    max_heart_rate?: number;
    kilojoule?: number;
    percent_recorded?: number;
    distance_meter?: number;
    altitude_gain_meter?: number;
    altitude_change_meter?: number;
    zone_durations?: Record<string, number>;
  } | null;
}

export interface WhoopPaginatedResponse<T> {
  records: T[];
  next_token?: string | null;
}
