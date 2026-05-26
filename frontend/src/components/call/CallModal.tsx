import React, { useEffect, useRef } from 'react';
import {Avatar, Button, IconButton, Modal} from "@mui/material";
import CallEndIcon from '@mui/icons-material/CallEnd';
import CallIcon from '@mui/icons-material/Call';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "../../redux/Store";
import {Client} from "stompjs";
import styles from './CallModal.module.scss';

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
            { urls: 'stun:stun1.l.google.com:19302' },
            {
                urls: "turn:openrelay.metered.ca:80",
                username: "openrelayproject",
                credential: "openrelayproject"
            },
            {
                urls: "turn:openrelay.metered.ca:443",
                username: "openrelayproject",
                credential: "openrelayproject"
            },
            {
                urls: "turn:openrelay.metered.ca:443?transport=tcp",
                username: "openrelayproject",
                credential: "openrelayproject"
            }
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
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("mediaDevices API not supported");
            }
            let stream: MediaStream;
            try {
                // Try to get exactly what was requested
                stream = await navigator.mediaDevices.getUserMedia({
                    video: callState.callType === 'VIDEO',
                    audio: true
                });
            } catch (mediaErr: any) {
                console.warn("Primary media request failed, trying audio only...", mediaErr);
                // Fallback: If video fails (e.g. no webcam), try audio only
                stream = await navigator.mediaDevices.getUserMedia({
                    video: false,
                    audio: true
                });
                alert("Could not access camera. Falling back to voice only.");
            }
            
            console.log("Local media setup successful. Tracks:", stream.getTracks().map(t => t.kind));
            dispatch({ type: 'SET_LOCAL_STREAM', payload: stream });
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.play().catch(e => console.log("Local video play error:", e));
            }
            return stream;
        } catch (err) {
            console.error("Total failure accessing media devices.", err);
            alert("WebRTC setup error: Microphone or camera access denied.");
            handleEndCall();
        }
    };

    const createPeerConnection = (stream: MediaStream) => {
        console.log("Creating RTCPeerConnection...");
        const pc = new RTCPeerConnection(configuration);
        peerConnection.current = pc;

        // Add local tracks
        stream.getTracks().forEach(track => {
            console.log("Adding track to PC:", track.kind);
            pc.addTrack(track, stream);
        });

        // Set remote stream Ref
        pc.ontrack = (event) => {
            console.log("OnTrack event triggered. Tracks count:", event.streams[0]?.getTracks().length);
            const remoteStream = event.streams[0];
            dispatch({ type: 'SET_REMOTE_STREAM', payload: remoteStream });
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
                remoteVideoRef.current.play().catch(e => console.log("Remote video play error:", e));
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("Generated local ICE Candidate:", event.candidate.candidate);
                sendSignal('ICE_CANDIDATE', JSON.stringify(event.candidate));
            }
        };

        pc.onconnectionstatechange = () => {
            console.log("WebRTC Connection State changed to:", pc.connectionState);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                console.warn("Connection lost. Terminating call.");
                handleEndCall();
            }
        };

        return pc;
    };

    const startCallFlow = async () => {
        const stream = await setupMedia();
        if (!stream) return;

        const pc = createPeerConnection(stream);
        
        console.log("Creating WebRTC Offer...");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("Local Description Set successfully.");
        sendSignal('OFFER', JSON.stringify(offer));
    };

    const acceptCallFlow = async () => {
        const stream = await setupMedia();
        if (!stream) return;

        const pc = createPeerConnection(stream);

        if (callState.pendingOffer) {
            console.log("Setting remote description (Offer)...");
            await pc.setRemoteDescription(new RTCSessionDescription(callState.pendingOffer));
            
            console.log("Creating WebRTC Answer...");
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal('ANSWER', JSON.stringify(answer));
        } else {
            console.warn("Offer was null, cannot accept WebRTC connection!");
        }
    };

    const processQueuedIceCandidates = async () => {
        const pc = peerConnection.current;
        if (pc && pc.remoteDescription && pendingIceCandidatesRef.current.length > 0) {
            console.log(`Processing ${pendingIceCandidatesRef.current.length} queued remote ICE Candidates...`);
            const candidates = [...pendingIceCandidatesRef.current];
            dispatch({ type: 'CLEAR_ICE_CANDIDATES' });
            
            for (const candidate of candidates) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log("Successfully added queued candidate.");
                } catch (e) {
                    console.error("Error adding queued candidate", e);
                }
            }
        }
    };

    // Caller Effect: Start Call WebRTC Flow
    useEffect(() => {
        if (callState.isCalling && !callState.incomingCall && !callState.isAccepted && !peerConnection.current) {
            startCallFlow();
        }
    }, [callState.isCalling]);

    // Receiver Effect: Handle answer signaling
    useEffect(() => {
        const handleAnswerSignal = async () => {
            const pc = peerConnection.current;
            if (callState.isAccepted && !callState.incomingCall && callState.pendingAnswer && pc && !pc.remoteDescription) {
                console.log("Setting remote description (Answer)...");
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(callState.pendingAnswer));
                    await processQueuedIceCandidates();
                } catch (e) {
                    console.error("Failed to set remote description answer", e);
                }
            }
        };
        handleAnswerSignal();
    }, [callState.isAccepted, callState.pendingAnswer]);

    // Receiver Effect: Accept Call WebRTC Flow
    useEffect(() => {
        if (callState.isAccepted && callState.incomingCall && !peerConnection.current) {
            acceptCallFlow();
        }
    }, [callState.isAccepted]);

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
            <div className={styles.callModalContainer}>
                <div className={styles.callHeader}>
                    <h6>
                        {callState.isAccepted ? "In Call" : (callState.incomingCall ? "Incoming Call..." : "Calling...")}
                    </h6>
                    <span className={styles.callTypeBadge}>
                        {callState.callType === 'VIDEO' ? "Video" : "Voice"}
                    </span>
                </div>

                {callState.isAccepted ? (
                    <div className={styles.acceptedContainer}>
                        <video ref={remoteVideoRef} autoPlay playsInline className={styles.remoteVideo} />
                        <div className={styles.localVideoPip}>
                            <video ref={localVideoRef} autoPlay playsInline muted className={styles.localVideo} />
                        </div>
                        <div className={styles.callOverlayDetails}>
                            <div className={styles.otherUserNameBadge}>
                                {otherUser?.fullName}
                            </div>
                            <Button 
                                size="small" 
                                onClick={() => remoteVideoRef.current?.play()}
                                className={styles.fixAudioBtn}
                            >
                                Fix Audio
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.ringingContainer}>
                        <div className={styles.avatarWrapper}>
                            <div className={styles.pulseCircle}></div>
                            <div className={styles.pulseCircle}></div>
                            <div className={styles.pulseCircle}></div>
                            <Avatar src={otherUser?.image || undefined} className={styles.ringingAvatar}>
                                {!otherUser?.image && otherUser?.fullName?.charAt(0)}
                            </Avatar>
                        </div>
                        <h4 className={styles.callerName}>{otherUser?.fullName}</h4>
                        <p className={styles.ringingStatus}>
                            {callState.callType === 'VIDEO' ? "Video Calling..." : "Voice Calling..."}
                        </p>
                    </div>
                )}

                <div className={styles.controlsDeck}>
                    {callState.incomingCall && !callState.isAccepted ? (
                        <>
                            <IconButton onClick={handleAcceptCall} className={styles.acceptCallBtn}>
                                <CallIcon fontSize="large" />
                            </IconButton>
                            <IconButton onClick={handleEndCall} className={styles.declineCallBtn}>
                                <CallEndIcon fontSize="large" />
                            </IconButton>
                        </>
                    ) : (
                        <>
                            <IconButton onClick={toggleMute} className={isMuted ? styles.mutedCallBtn : styles.standardCallBtn}>
                                {isMuted ? <MicOffIcon /> : <MicIcon />}
                            </IconButton>
                            <IconButton onClick={toggleVideo} className={isVideoOff ? styles.mutedCallBtn : styles.standardCallBtn}>
                                {isVideoOff ? <VideocamOffIcon /> : <VideocamIcon />}
                            </IconButton>
                            <IconButton onClick={handleEndCall} className={styles.declineCallBtn}>
                                <CallEndIcon />
                            </IconButton>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default CallModal;
