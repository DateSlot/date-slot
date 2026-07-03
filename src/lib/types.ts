export interface AvailableSlot {
  id: string;
  date: string;
  time_start: string;
  time_end: string;
}

export interface SlotsByDate {
  [date: string]: AvailableSlot[];
}

export interface BookingRequest {
  slot_id: string;
  name: string;
  activity: string;
}

export interface AdminSlot {
  id: string;
  date: string;
  time_start: string;
  time_end: string;
  is_booked: boolean;
  booker_name: string | null;
  booker_activity: string | null;
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
}
