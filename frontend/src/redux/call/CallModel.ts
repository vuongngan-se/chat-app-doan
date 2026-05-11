import {UserDTO} from "../auth/AuthModel";

export interface CallState {
    isCalling: boolean;
    incomingCall: boolean;
    isAccepted: boolean;
    caller: UserDTO | null;
    receiver: UserDTO | null;
    chatId: string | null;
    callType: 'VOICE' | 'VIDEO' | null;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    pendingOffer: any | null;
    pendingAnswer: any | null;
    pendingIceCandidates: any[];
}
