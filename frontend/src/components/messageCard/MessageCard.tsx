import {MessageDTO} from "../../redux/message/MessageModel";
import {UserDTO} from "../../redux/auth/AuthModel";
import styles from './MessageCard.module.scss';
import {Chip, Box, IconButton, Slider, Typography} from "@mui/material";
import React, { useState, useRef } from "react";
import {getDateFormat} from "../utils/Utils";
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { useTheme } from '@mui/material/styles';

interface MessageCardProps {
    message: MessageDTO;
    reqUser: UserDTO | null;
    isNewDate: boolean;
    isGroup: boolean;
}

const CustomAudioPlayer = ({ src, isDark }: { src: string, isDark: boolean }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100);
        }
    };

    const handleSliderChange = (event: Event, newValue: number | number[]) => {
        if (audioRef.current) {
            const newTime = ((newValue as number) / 100) * (audioRef.current.duration || 0);
            audioRef.current.currentTime = newTime;
            setProgress(newValue as number);
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time) || !isFinite(time)) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 220, bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', p: 1, borderRadius: 2 }}>
            <audio 
                ref={audioRef} 
                src={src} 
                onTimeUpdate={handleTimeUpdate} 
                onEnded={() => setIsPlaying(false)} 
            />
            <IconButton onClick={togglePlay} size="small" sx={{ color: 'inherit', bgcolor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)', '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)' } }}>
                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
            <Slider 
                size="small" 
                value={progress || 0} 
                onChange={handleSliderChange} 
                sx={{ color: 'inherit', py: 1, '& .MuiSlider-thumb': { width: 12, height: 12 } }}
            />
            <Typography variant="caption" sx={{ minWidth: 30 }}>
                {formatTime(audioRef.current?.currentTime || 0)}
            </Typography>
        </Box>
    );
};

const MessageCard = (props: MessageCardProps) => {

    const isOwnMessage = props.message.user.id === props.reqUser?.id;
    const date: Date = new Date(props.message.timeStamp);
    const hours = isNaN(date.getTime()) ? "00" : (date.getHours() < 10 ? '0' + date.getHours() : date.getHours().toString());
    const minutes = isNaN(date.getTime()) ? "00" : (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes().toString());

    const isImage = (url: string) => {
        return url.startsWith('data:image/') || url.match(/\.(jpeg|jpg|gif|png)$/) != null;
    };

    const isAudio = (url: string) => {
        return url.startsWith('data:audio/') || url.match(/\.(webm|mp3|wav|ogg)$/) != null;
    };

    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const ownBg = isDark ? '#005c4b' : '#d3fdd3';
    const otherBg = isDark ? '#202c33' : 'white';
    const dateBg = isDark ? '#1e2b33' : '#faebd7';
    const fileBg = isDark ? '#2a3942' : '#f0f0f0';

    const label: React.ReactElement = (
        <div className={styles.bubbleContainer}>
            {props.isGroup && !isOwnMessage && <h4 className={styles.contentContainer}>{props.message.user.fullName}:</h4>}
            {props.message.fileUrl && (
                <div style={{marginBottom: '0.5rem'}}>
                    {isImage(props.message.fileUrl) ? (
                        <img src={props.message.fileUrl} alt="attachment" style={{maxWidth: '100%', borderRadius: '8px', display: 'block'}} />
                    ) : isAudio(props.message.fileUrl) ? (
                        <CustomAudioPlayer src={props.message.fileUrl} isDark={isDark} />
                    ) : (
                        <div style={{display: 'flex', alignItems: 'center', backgroundColor: fileBg, padding: '8px', borderRadius: '8px'}}>
                            <span style={{marginRight: '8px', fontSize: '0.9rem'}}>{props.message.fileName}</span>
                            <a href={props.message.fileUrl} download={props.message.fileName} style={{display: 'flex', color: 'inherit'}}>
                                <DownloadIcon fontSize="small" />
                            </a>
                        </div>
                    )}
                </div>
            )}
            {(!props.message.fileUrl || !isAudio(props.message.fileUrl)) && (
                <p className={styles.contentContainer}>{props.message.content}</p>
            )}
            <p className={styles.timeContainer}>{hours + ":" + minutes}</p>
        </div>
    );

    const dateLabel: React.ReactElement = (
      <p>{getDateFormat(date)}</p>
    );

    return (
        <div className={styles.messageCardInnerContainer}>
            {props.isNewDate && <div className={styles.date}>{<Chip label={dateLabel}
                                                                    sx={{height: 'auto', width: 'auto', backgroundColor: dateBg}}/>}</div>}
            <div className={isOwnMessage ? styles.ownMessage : styles.othersMessage}>
                <Chip label={label}
                      sx={{height: 'auto', width: 'auto', backgroundColor: isOwnMessage ? ownBg : otherBg, ml: '0.75rem'}}/>
            </div>
        </div>
    );
};

export default MessageCard;