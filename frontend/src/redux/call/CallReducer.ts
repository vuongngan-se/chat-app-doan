import {CallState} from "./CallModel";

const initialState: CallState = {
    isCalling: false,
    incomingCall: false,
    isAccepted: false,
    caller: null,
    receiver: null,
    chatId: null,
    callType: null,
    localStream: null,
    remoteStream: null,
    pendingOffer: null,
    pendingAnswer: null,
    pendingIceCandidates: [],
};

export const callReducer = (state = initialState, action: any): CallState => {
    switch (action.type) {
        case 'START_CALL':
            return {
                ...state,
                isCalling: true,
                caller: action.payload.caller,
                receiver: action.payload.receiver,
                chatId: action.payload.chatId,
                callType: action.payload.callType,
            };
        case 'INCOMING_CALL':
            return {
                ...state,
                isCalling: true,
                incomingCall: true,
                caller: action.payload.caller,
                receiver: action.payload.receiver,
                chatId: action.payload.chatId,
                callType: action.payload.callType,
            };
        case 'ACCEPT_CALL':
            return {
                ...state,
                isAccepted: true,
                incomingCall: false,
                isCalling: true,
            };
        case 'SET_LOCAL_STREAM':
            return { ...state, localStream: action.payload };
        case 'SET_REMOTE_STREAM':
            return { ...state, remoteStream: action.payload };
        case 'SET_OFFER':
            return { ...state, pendingOffer: action.payload };
        case 'SET_ANSWER':
            return { ...state, pendingAnswer: action.payload };
        case 'ADD_ICE_CANDIDATE':
            return { ...state, pendingIceCandidates: [...state.pendingIceCandidates, action.payload] };
        case 'CLEAR_ICE_CANDIDATES':
            return { ...state, pendingIceCandidates: [] };
        case 'END_CALL':
            return initialState;
        default:
            return state;
    }
};
