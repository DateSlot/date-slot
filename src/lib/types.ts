export interface AvailableSlot {
  id: string;
  date: string;
  time_start: string;
  time_end: string;
  activity?: string | null;
}

export interface SlotsByDate {
  [date: string]: AvailableSlot[];
}

export interface BookingRequest {
  slot_id: string;
  name: string;
  activity?: string;
}

export interface AdminSlot {
  id: string;
  date: string;
  time_start: string;
  time_end: string;
  is_booked: boolean;
  booker_name: string | null;
  booker_activity: string | null;
  activity: string | null;
  created_at: string;
}

export interface RsvpRecord {
  id: string;
  slot_id: string;
  name: string;
  activity: string;
  date: string;
  time_start: string;
  time_end: string;
  created_at: string;
}

export interface CreateSlotRequest {
  date: string;
  time_start: string;
  time_end: string;
  activity?: string;
}

export interface ProfileData {
  username: string;
  display_name: string;
  likes?: string | null;
}

export const ACTIVITY_OPTIONS = [
  { id: "park", emoji: "🌳", title: "Walk in the Park" },
  { id: "bar", emoji: "🍸", title: "Bar" },
  { id: "restaurant", emoji: "🍽️", title: "Restaurant" },
  { id: "museum", emoji: "🏛️", title: "Museum" },
] as const;

export const CUSTOM_ACTIVITY = "__custom__";
