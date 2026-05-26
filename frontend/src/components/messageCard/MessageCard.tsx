import {MessageDTO} from "../../redux/message/MessageModel";
import {UserDTO} from "../../redux/auth/AuthModel";
import styles from './MessageCard.module.scss';
import {Box, IconButton, Slider, Typography, Avatar} from "@mui/material";
import React, { useState, useRef } from "react";
import {getDateFormat, getInitialsFromName} from "../utils/Utils";
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { useTheme } from '@mui/material/styles';

interface MessageCardProps {
    message: MessageDTO;
    reqUser: UserDTO | null;
    isNewDate: boolean;
    isGroup: boolean;
    reactions?: Array<{userId: string, emoji: string, userName: string}>;
    onReact?: (emoji: string) => void;
    isFirstInGroup?: boolean;
    isLastInGroup?: boolean;
}

const CustomAudioPlayer = ({ src, isDark }: { src: string, isDark: boolean }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
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

    const [showReactionPicker, setShowReactionPicker] = useState(false);

    const isImage = (url: string) => {
        return url.startsWith('data:image/') || url.match(/\.(jpeg|jpg|gif|png)$/) != null;
    };

    const isAudio = (url: string) => {
        return url.startsWith('data:audio/') || url.match(/\.(webm|mp3|wav|ogg)$/) != null;
    };

    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const initials = getInitialsFromName(props.message.user.fullName);

    const isFirst = props.isFirstInGroup ?? true;
    const isLast = props.isLastInGroup ?? true;

    // Border styling logic based on clustering
    let bubbleClass = styles.bubble;
    if (isOwnMessage) {
        if (isFirst && isLast) {
            bubbleClass += ` ${styles.ownBubbleSingle}`;
        } else if (isFirst) {
            bubbleClass += ` ${styles.ownBubbleFirst}`;
        } else if (isLast) {
            bubbleClass += ` ${styles.ownBubbleLast}`;
        } else {
            bubbleClass += ` ${styles.ownBubbleMiddle}`;
        }
    } else {
        if (isFirst && isLast) {
            bubbleClass += ` ${styles.othersBubbleSingle}`;
        } else if (isFirst) {
            bubbleClass += ` ${styles.othersBubbleFirst}`;
        } else if (isLast) {
            bubbleClass += ` ${styles.othersBubbleLast}`;
        } else {
            bubbleClass += ` ${styles.othersBubbleMiddle}`;
        }
    }

    if (props.reactions && props.reactions.length > 0) {
        bubbleClass += ` ${styles.hasReactions}`;
    }

    const renderReactionsOverlay = () => {
        if (!props.reactions || props.reactions.length === 0) return null;

        const emojiMap: Record<string, number> = {};
        props.reactions.forEach(r => {
            emojiMap[r.emoji] = (emojiMap[r.emoji] || 0) + 1;
        });

        const emojis = Object.keys(emojiMap);
        const totalCount = props.reactions.length;
        const tooltipText = props.reactions.map(r => `${r.userName} (${r.emoji})`).join(', ');

        return (
            <div 
                className={`${styles.reactionsOverlay} ${isOwnMessage ? styles.ownReactionsOverlay : styles.othersReactionsOverlay}`} 
                title={tooltipText}
            >
                <span className={styles.reactionsList}>
                    {emojis.map((emoji, idx) => (
                        <span key={idx} className={styles.reactionEmojiItem}>{emoji}</span>
                    ))}
                </span>
                {totalCount > 1 && <span className={styles.reactionsCount}>{totalCount}</span>}
            </div>
        );
    };

    const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '😡'];

    const renderReactionPicker = () => {
        if (!showReactionPicker) return null;
        return (
            <div className={`${styles.reactionPickerFloating} ${isOwnMessage ? styles.ownPicker : styles.othersPicker}`}>
                {EMOJI_LIST.map((emoji) => (
                    <button 
                        key={emoji} 
                        className={styles.pickerEmojiBtn}
                        onClick={(e) => {
                            e.stopPropagation();
                            props.onReact?.(emoji);
                            setShowReactionPicker(false);
                        }}
                    >
                        {emoji}
                    </button>
                ))}
                {props.reactions?.some(r => r.userId === props.reqUser?.id) && (
                    <button 
                        className={styles.pickerRemoveBtn} 
                        onClick={(e) => {
                            e.stopPropagation();
                            props.onReact?.('REMOVE');
                            setShowReactionPicker(false);
                        }}
                        title="Remove reaction"
                    >
                        ✕
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className={styles.messageCardInnerContainer} onMouseLeave={() => setShowReactionPicker(false)}>
            {props.isNewDate && (
                <div className={styles.date}>
                    <span className={styles.dateLabel}>{getDateFormat(date)}</span>
                </div>
            )}
            
            <div className={`${styles.messageRow} ${isOwnMessage ? styles.ownMessageRow : styles.othersMessageRow}`}>
                {!isOwnMessage && (
                    isLast ? (
                        <Avatar 
                            sx={{ 
                                width: '2rem', 
                                height: '2rem', 
                                fontSize: '0.8rem', 
                                fontWeight: 'bold', 
                                mr: '0.5rem', 
                                alignSelf: 'flex-end',
                                boxShadow: 'var(--shadow-sm)'
                            }} 
                            src={props.message.user.image || undefined}
                        >
                            {!props.message.user.image && initials}
                        </Avatar>
                    ) : (
                        <div style={{ width: '2.5rem', flexShrink: 0 }} /> // Spacer to align bubbles
                    )
                )}
                
                <div className={styles.bubbleWrapper}>
                    <div className={bubbleClass}>
                        {props.isGroup && !isOwnMessage && isFirst && (
                            <div className={styles.senderName}>{props.message.user.fullName}</div>
                        )}
                        
                        {props.message.fileUrl && (
                            <div className={styles.fileContainer}>
                                {isImage(props.message.fileUrl) ? (
                                    <img src={props.message.fileUrl} alt="attachment" className={styles.attachmentImg} />
                                ) : isAudio(props.message.fileUrl) ? (
                                    <CustomAudioPlayer src={props.message.fileUrl} isDark={isDark} />
                                ) : (
                                    <div className={styles.fileAttachment}>
                                        <span className={styles.fileName}>{props.message.fileName}</span>
                                        <a href={props.message.fileUrl} download={props.message.fileName} className={styles.fileDownloadLink}>
                                            <DownloadIcon fontSize="small" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {(!props.message.fileUrl || !isAudio(props.message.fileUrl)) && (
                            <p className={styles.messageContent}>{props.message.content}</p>
                        )}
                        
                        <span className={styles.timestamp}>{hours + ":" + minutes}</span>
                        {renderReactionsOverlay()}
                    </div>

                    <div className={styles.reactTriggerContainer}>
                        <button 
                            className={styles.reactTriggerBtn} 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowReactionPicker(!showReactionPicker);
                            }}
                            title="React"
                        >
                            ☺
                        </button>
                        {renderReactionPicker()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageCard;