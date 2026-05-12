import React, { useEffect, useRef } from 'react';
import {Avatar, Box, Button, IconButton, Modal, Typography} from "@mui/material";
import CallEndIcon from '@mui/icons-material/CallEnd';
import CallIcon from '@mui/icons-material/Call';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "../../redux/Store";
import {Client} from "stompjs";
import {WebSocketMessageDTO} from "../../redux/message/MessageModel";

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 600,
    bgcolor: '#1a1a1a',
    color: '#fff',
    boxShadow: 24,
    p: 0,
    borderRadius: 4,
    overflow: 'hidden',
    textAlign: 'center'
};

interface CallModalProps {
    stompClient: Client | null | undefined;
    isConnected: boolean;
}

const CallModal = ({ stompClient, isConnected }: CallModalProps) => {
    const callState = useSelector((state: RootState) => state.call);
    const authState = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();
    
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pendingIceCandidatesRef = useRef(callState.pendingIceCandidates);
    
    useEffect(() => {
        pendingIceCandidatesRef.current = callState.pendingIceCandidates;
    }, [callState.pendingIceCandidates]);
    const [isMuted, setIsMuted] = React.useState(false);
    const [isVideoOff, setIsVideoOff] = React.useState(false);

    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    const sendSignal = (type: string, content: string = "") => {
        if (stompClient && isConnected && authState.reqUser && callState.chatId) {
            const signalMessage: any = {
                messageType: type,
                content: content,
                chat: { id: callState.chatId } as any,
                user: authState.reqUser,
                timeStamp: new Date().toISOString()
            };
            console.log(`Sending WebRTC signal [${type}]`);
            stompClient.send("/app/messages", {}, JSON.stringify(signalMessage));
        } else {
            console.warn("Cannot send signal: missing connection or data", { type, isConnected, chatId: callState.chatId });
        }
    };

    const setupMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: callState.callType === 'VIDEO',
                audio: true
            });
            console.log("Local media setup successful. Tracks:", stream.getTracks().map(t => t.kind));
            dispatch({ type: 'SET_LOCAL_STREAM', payload: stream });
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.play().catch(e => console.log("Local video play error:", e));
            }
            return stream;
        } catch (err) {
            console.error("Error accessing media devices.", err);
            alert("Could not access Camera/Microphone. Please check permissions.");
        }
    };

    const initPeerConnection = (stream: MediaStream) => {
        console.log("Initializing PeerConnection...");
        const pc = new RTCPeerConnection(configuration);
        
        stream.getTracks().forEach(track => {
            console.log("Adding local track to PC:", track.kind);
            pc.addTrack(track, stream);
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal('ICE_CANDIDATE', JSON.stringify(event.candidate));
            }
        };

        pc.ontrack = (event) => {
            console.log(`Remote track received: ${event.track.kind}`);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
                remoteVideoRef.current.play().catch(e => console.log("Remote video play error:", e));
            }
            dispatch({ type: 'SET_REMOTE_STREAM', payload: event.streams[0] });
        };

        pc.onsignalingstatechange = () => {
            console.log("Signaling state changed to:", pc.signalingState);
        };

        peerConnection.current = pc;
        return pc;
    };

    // Caller: Create Offer
    useEffect(() => {
        if (callState.isCalling && !callState.incomingCall && !callState.isAccepted) {
            setupMedia().then(stream => {
                if (stream) {
                    const pc = initPeerConnection(stream);
                    pc.createOffer().then(offer => {
                        pc.setLocalDescription(offer);
                        sendSignal('OFFER', JSON.stringify(offer));
                    });
                }
            });
        }
    }, [callState.isCalling, callState.incomingCall]);

    const processQueuedIceCandidates = () => {
        const candidates = pendingIceCandidatesRef.current;
        if (peerConnection.current && peerConnection.current.remoteDescription && candidates.length > 0) {
            console.log(`Processing ${candidates.length} queued ICE candidates`);
            candidates.forEach(candidate => {
                peerConnection.current?.addIceCandidate(new RTCIceCandidate(candidate))
                    .catch(e => console.error("Error adding queued ice candidate", e));
            });
            dispatch({ type: 'CLEAR_ICE_CANDIDATES' });
        }
    };

    // Receiver: Handle Offer
    useEffect(() => {
        if (callState.isAccepted && callState.pendingOffer && !peerConnection.current) {
            setupMedia().then(stream => {
                if (stream) {
                    const pc = initPeerConnection(stream);
                    pc.setRemoteDescription(new RTCSessionDescription(callState.pendingOffer))
                        .then(() => {
                            processQueuedIceCandidates();
                            return pc.createAnswer();
                        })
                        .then(answer => {
                            pc.setLocalDescription(answer);
                            sendSignal('ANSWER', JSON.stringify(answer));
                            dispatch({ type: 'SET_OFFER', payload: null }); // Clear processed offer
                        })
                        .catch(err => console.error("Error handling offer", err));
                }
            });
        }
    }, [callState.isAccepted, callState.pendingOffer]);

    // Caller: Handle Answer
    useEffect(() => {
        if (callState.pendingAnswer && peerConnection.current && peerConnection.current.signalingState === 'have-local-offer') {
            peerConnection.current.setRemoteDescription(new RTCSessionDescription(callState.pendingAnswer))
                .then(() => {
                    processQueuedIceCandidates();
                    dispatch({ type: 'SET_ANSWER', payload: null }); // Clear processed answer
                })
                .catch(err => console.error("Error setting remote answer", err));
        }
    }, [callState.pendingAnswer]);

    // Both: Handle ICE Candidates
    useEffect(() => {
        processQueuedIceCandidates();
    }, [callState.pendingIceCandidates, callState.isAccepted]);

    useEffect(() => {
        if (callState.localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = callState.localStream;
            localVideoRef.current.play().catch(e => console.log("Local video play error:", e));
        }
        if (callState.remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = callState.remoteStream;
            remoteVideoRef.current.play().catch(e => console.log("Remote video play error:", e));
        }
    }, [callState.localStream, callState.remoteStream, callState.isAccepted]);

    const handleEndCall = () => {
        if (peerConnection.current) peerConnection.current.close();
        if (callState.localStream) callState.localStream.getTracks().forEach(t => t.stop());
        sendSignal(callState.isAccepted ? 'CALL_END' : 'CALL_REJECT');
        dispatch({ type: 'END_CALL' });
    };

    const handleAcceptCall = () => {
        dispatch({ type: 'ACCEPT_CALL' });
        sendSignal('CALL_ACCEPT');
    };

    const toggleMute = () => {
        if (callState.localStream) {
            callState.localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (callState.localStream) {
            callState.localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoOff(!isVideoOff);
        }
    };

    if (!callState.isCalling && !callState.incomingCall) return null;

    const otherUser = callState.incomingCall ? callState.caller : callState.receiver;

    return (
        <Modal open={true} onClose={handleEndCall}>
            <Box sx={style}>
                <Box sx={{ p: 3, bgcolor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">
                        {callState.isAccepted ? "In Call" : (callState.incomingCall ? "Incoming Call..." : "Calling...")}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.7)">
                        {callState.callType === 'VIDEO' ? "Video" : "Voice"}
                    </Typography>
                </Box>

                {callState.isAccepted ? (
                    <Box sx={{ position: 'relative', height: 400, bgcolor: '#000' }}>
                        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <Box sx={{ position: 'absolute', top: 20, right: 20, width: 150, height: 100, borderRadius: 2, overflow: 'hidden', border: '2px solid #fff', boxShadow: 3 }}>
                            <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </Box>
                        <Box sx={{ position: 'absolute', bottom: 20, left: 20, display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Box sx={{ bgcolor: 'rgba(0,0,0,0.5)', px: 1.5, py: 0.5, borderRadius: 1 }}>
                                <Typography variant="body2">{otherUser?.fullName}</Typography>
                            </Box>
                            <Button 
                                size="small" 
                                variant="contained" 
                                onClick={() => remoteVideoRef.current?.play()}
                                sx={{ bgcolor: 'rgba(255,255,255,0.2)', fontSize: '10px' }}
                            >
                                Fix Audio
                            </Button>
                        </Box>
                    </Box>
                ) : (
                    <Box sx={{ py: 8 }}>
                        <Avatar src={otherUser?.image || undefined} sx={{ width: 120, height: 120, margin: '0 auto 24px' }}>
                            {otherUser?.fullName?.charAt(0)}
                        </Avatar>
                        <Typography variant="h4" gutterBottom>{otherUser?.fullName}</Typography>
                        <Typography variant="h6" color="rgba(255,255,255,0.6)">{callState.callType === 'VIDEO' ? "Video Calling..." : "Voice Calling..."}</Typography>
                    </Box>
                )}

                <Box sx={{ py: 3, display: 'flex', justifyContent: 'center', gap: 4, bgcolor: 'rgba(0,0,0,0.6)' }}>
                    {callState.incomingCall && !callState.isAccepted ? (
                        <>
                            <IconButton onClick={handleAcceptCall} sx={{ bgcolor: '#4caf50', color: 'white', width: 64, height: 64, '&:hover': {bgcolor: '#388e3c'} }}>
                                <CallIcon fontSize="large" />
                            </IconButton>
                            <IconButton onClick={handleEndCall} sx={{ bgcolor: '#f44336', color: 'white', width: 64, height: 64, '&:hover': {bgcolor: '#d32f2f'} }}>
                                <CallEndIcon fontSize="large" />
                            </IconButton>
                        </>
                    ) : (
                        <>
                            <IconButton onClick={toggleMute} sx={{ color: 'white', bgcolor: isMuted ? 'rgba(244,67,54,0.8)' : 'rgba(255,255,255,0.1)', '&:hover': {bgcolor: isMuted ? 'rgba(244,67,54,1)' : 'rgba(255,255,255,0.2)'} }}>
                                {isMuted ? <MicOffIcon /> : <MicIcon />}
                            </IconButton>
                            <IconButton onClick={toggleVideo} sx={{ color: 'white', bgcolor: isVideoOff ? 'rgba(244,67,54,0.8)' : 'rgba(255,255,255,0.1)', '&:hover': {bgcolor: isVideoOff ? 'rgba(244,67,54,1)' : 'rgba(255,255,255,0.2)'} }}>
                                {isVideoOff ? <VideocamOffIcon /> : <VideocamIcon />}
                            </IconButton>
                            <IconButton onClick={handleEndCall} sx={{ bgcolor: '#f44336', color: 'white', width: 56, height: 56, '&:hover': {bgcolor: '#d32f2f'} }}>
                                <CallEndIcon />
                            </IconButton>
                        </>
                    )}
                </Box>
            </Box>
        </Modal>
    );
};

export default CallModal;
