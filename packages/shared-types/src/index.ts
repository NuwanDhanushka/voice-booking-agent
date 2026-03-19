export type ConversationState =
    | 'waiting_for_request'
    | 'waiting_for_missing_info'
    | 'waiting_for_slot_selection'
    | 'ready_to_confirm'
    | 'booked';

export interface AvailableSlot {
    resourceId: string;
    resourceName: string;
    startTime: string;
    endTime: string;
}