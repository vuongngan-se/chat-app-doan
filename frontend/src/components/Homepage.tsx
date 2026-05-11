import styles from './Homepage.module.scss';
import React, {useEffect, useState} from "react";
import {NavigateFunction, useNavigate} from "react-router-dom";
import {useDispatch, useSelector} from "react-redux";
import {AppDispatch, RootState} from "../redux/Store";
import {BASE_API_URL, TOKEN} from "../config/Config";
import EditGroupChat from "./editChat/EditGroupChat";
import Profile from "./profile/Profile";
import CallModal from "./call/CallModal";
import {Avatar, Divider, IconButton, InputAdornment, Menu, MenuItem, TextField, Snackbar, Alert} from "@mui/material";
import ChatIcon from '@mui/icons-material/Chat';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {currentUser, logoutUser} from "../redux/auth/AuthAction";
import SearchIcon from '@mui/icons-material/Search';
import {getUserChats, markChatAsRead} from "../redux/chat/ChatAction";
import {ChatDTO} from "../redux/chat/ChatModel";
import ChatCard from "./chatCard/ChatCard";
import {getInitialsFromName} from "./utils/Utils";
import ClearIcon from '@mui/icons-material/Clear';
import WelcomePage from "./welcomePage/WelcomePage";
import MessagePage from "./messagePage/MessagePage";
import {MessageDTO, WebSocketMessageDTO} from "../redux/message/MessageModel";
import {createMessage, getAllMessages, receiveMessage} from "../redux/message/MessageAction";
import SockJS from 'sockjs-client';
import {Client, over, Subscription} from "stompjs";
import {AUTHORIZATION_PREFIX} from "../redux/Constants";
import CreateGroupChat from "./editChat/CreateGroupChat";
import CreateSingleChat from "./editChat/CreateSingleChat";
import { ThemeModeContext } from "../App";
import { useContext } from "react";
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

const Homepage = () => {

    const authState = useSelector((state: RootState) => state.auth);
    const chatState = useSelector((state: RootState) => state.chat);
    const messageState = useSelector((state: RootState) => state.message);
    const callState = useSelector((state: RootState) => state.call);
    const navigate: NavigateFunction = useNavigate();
    const dispatch: AppDispatch = useDispatch();
    const token: string | null = localStorage.getItem(TOKEN);
    const [isShowEditGroupChat, setIsShowEditGroupChat] = useState<boolean>(false);
    const [isShowCreateGroupChat, setIsShowCreateGroupChat] = useState<boolean>(false);
    const [isShowCreateSingleChat, setIsShowCreateSingleChat] = useState<boolean>(false);
    const [isShowProfile, setIsShowProfile] = useState<boolean>(false);
    const [anchor, setAnchor] = useState(null);
    const [initials, setInitials] = useState<string>("");
    const [query, setQuery] = useState<string>("");
    const [focused, setFocused] = useState<boolean>(false);
    const [currentChat, setCurrentChat] = useState<ChatDTO | null>(null);
    const [messages, setMessages] = useState<MessageDTO[]>([]);
    const [newMessage, setNewMessage] = useState<string>("");
    const [stompClient, setStompClient] = useState<Client | undefined>();
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [messageReceived, setMessageReceived] = useState<boolean>(false);
    const [subscribeTry, setSubscribeTry] = useState<number>(1);
    const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
    const themeMode = useContext(ThemeModeContext);
    const open = Boolean(anchor);

    useEffect(() => {
        if (token && !authState.reqUser) {
            dispatch(currentUser(token));
        }
    }, [token, dispatch, authState.reqUser, navigate]);

    useEffect(() => {
        if (!token || authState.reqUser === null) {
            navigate("/signin");
        }
    }, [token, navigate, authState.reqUser]);

    useEffect(() => {
        if (authState.reqUser && authState.reqUser.fullName) {
            const letters = getInitialsFromName(authState.reqUser.fullName);
            setInitials(letters);
        }
    }, [authState.reqUser?.fullName]);

    useEffect(() => {
        if (token) {
            dispatch(getUserChats(token));
        }
    }, [chatState.createdChat, chatState.createdGroup, dispatch, token, messageState?.newMessage, chatState.deletedChat, chatState.editedGroup, chatState.markedAsReadChat]);

    useEffect(() => {
        setCurrentChat(chatState.editedGroup);
    }, [chatState.editedGroup]);

    useEffect(() => {
        if (currentChat?.id && token) {
            dispatch(getAllMessages(currentChat.id, token));
        }
    }, [currentChat, dispatch, token, messageState?.newMessage]);

    useEffect(() => {
        if (messageState?.messages) {
            setMessages(messageState.messages);
        }
    }, [messageState?.messages]);

    useEffect(() => {
        if (messageState?.newMessage && stompClient && currentChat && isConnected) {
            const webSocketMessage: WebSocketMessageDTO = {...messageState.newMessage, chat: currentChat};
            console.log("Sending message via WebSocket:", webSocketMessage);
            stompClient.send("/app/messages", {}, JSON.stringify(webSocketMessage));
        } else if (messageState?.newMessage) {
            console.warn("Message created but NOT sent via WebSocket because:", {
                stompClient: !!stompClient,
                currentChat: !!currentChat,
                isConnected
            });
        }
    }, [messageState?.newMessage]);

    // Removed redundant subscription useEffect

    useEffect(() => {
        if (messageReceived && currentChat?.id && token) {
            dispatch(markChatAsRead(currentChat.id, token));
            dispatch(getAllMessages(currentChat.id, token));
        }
        if (token) {
            dispatch(getUserChats(token));
        }
        setMessageReceived(false);
    }, [messageReceived]);

    useEffect(() => {
        connect();
    }, []);

    const connect = () => {
        const headers = {
            Authorization: `${AUTHORIZATION_PREFIX}${token}`
        };

        const socket: WebSocket = new SockJS(`${BASE_API_URL}/ws`);
        const client: Client = over(socket);
        client.connect(headers, () => onConnect(client), onError);
        setStompClient(client);
    };

    const onConnect = (client: Client) => {
        setIsConnected(true);
        if (authState.reqUser?.id) {
            client.subscribe(`/topic/${authState.reqUser.id}`, onMessageReceive);
        }
    };

    const onError = (error: any) => {
        console.error("WebSocket connection error", error);
    };

    const onMessageReceive = (payload: any) => {
        const receivedMessage: WebSocketMessageDTO = JSON.parse(payload.body);
        console.log("WebSocket message received:", receivedMessage);
        
        try {
            console.log("Checking message type:", receivedMessage.messageType);
            console.log("Compare IDs:", {
                senderId: receivedMessage.user?.id,
                myId: authState.reqUser?.id,
                isDifferent: receivedMessage.user?.id !== authState.reqUser?.id
            });

            if (receivedMessage.messageType === 'CALL_START' && receivedMessage.user?.id !== authState.reqUser?.id) {
                dispatch({
                    type: 'INCOMING_CALL',
                    payload: {
                        caller: receivedMessage.user,
                        receiver: authState.reqUser,
                        chatId: receivedMessage.chat?.id,
                        callType: receivedMessage.content?.includes('VIDEO') ? 'VIDEO' : 'VOICE'
                    }
                });
                dispatch(receiveMessage(receivedMessage));
            } else if (receivedMessage.user?.id !== authState.reqUser?.id) {
                // Only process signaling messages from OTHER users
                if (receivedMessage.messageType === 'CALL_ACCEPT') {
                    dispatch({ type: 'ACCEPT_CALL' });
                } else if (receivedMessage.messageType === 'OFFER') {
                    dispatch({ type: 'SET_OFFER', payload: JSON.parse(receivedMessage.content) });
                } else if (receivedMessage.messageType === 'ANSWER') {
                    dispatch({ type: 'SET_ANSWER', payload: JSON.parse(receivedMessage.content) });
                } else if (receivedMessage.messageType === 'ICE_CANDIDATE') {
                    dispatch({ type: 'ADD_ICE_CANDIDATE', payload: JSON.parse(receivedMessage.content) });
                } else if (receivedMessage.messageType === 'CALL_REJECT' || receivedMessage.messageType === 'CALL_END') {
                    setSnackbarMessage(receivedMessage.messageType === 'CALL_REJECT' ? 'Cuộc gọi bị từ chối' : 'Cuộc gọi đã kết thúc');
                    dispatch({ type: 'END_CALL' });
                    dispatch(receiveMessage(receivedMessage));
                } else {
                    dispatch(receiveMessage(receivedMessage));
                }
            } else if (receivedMessage.messageType !== 'OFFER' && 
                       receivedMessage.messageType !== 'ANSWER' && 
                       receivedMessage.messageType !== 'ICE_CANDIDATE') {
                // Still receive our own regular messages and CALL_START/END
                dispatch(receiveMessage(receivedMessage));
            }
        } catch (error) {
            console.error("Error processing WebSocket message:", error);
            // Fallback: still receive as regular message if possible
            if (receivedMessage.messageType === null || receivedMessage.messageType === undefined) {
                dispatch(receiveMessage(receivedMessage));
            }
        }
        setMessageReceived(true);
    };

    const onSendMessage = () => {
        if (currentChat?.id && token) {
            dispatch(createMessage({chatId: currentChat.id, content: newMessage}, token));
            setNewMessage("");
        }
    };

    const onOpenProfile = () => {
        onCloseMenu();
        setIsShowProfile(true);
    };

    const onCloseProfile = () => {
        setIsShowProfile(false);
    };

    const onOpenMenu = (e: any) => {
        setAnchor(e.currentTarget);
    };

    const onCloseMenu = () => {
        setAnchor(null);
    };

    const onCreateGroupChat = () => {
        onCloseMenu();
        setIsShowCreateGroupChat(true);
    };

    const onCreateSingleChat = () => {
        setIsShowCreateSingleChat(true);
    };

    const onLogout = () => {
        dispatch(logoutUser());
        navigate("/signin");
    };

    const onChangeQuery = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        setQuery(e.target.value.toLowerCase());
    };

    const onClearQuery = () => {
        setQuery("");
    };

    const onClickChat = (chat: ChatDTO) => {
        if (token) {
            dispatch(markChatAsRead(chat.id, token));
        }
        setCurrentChat(chat);
    };

    const getSearchEndAdornment = () => {
        return query.length > 0 &&
            <InputAdornment position='end'>
                <IconButton onClick={onClearQuery}>
                    <ClearIcon/>
                </IconButton>
            </InputAdornment>
    };

    return (
        <div>
            <div className={styles.outerContainer}>
                <div className={styles.innerContainer}>
                    <div className={styles.sideBarContainer}>
                        {isShowCreateSingleChat &&
                            <CreateSingleChat setIsShowCreateSingleChat={setIsShowCreateSingleChat}/>}
                        {isShowCreateGroupChat &&
                            <CreateGroupChat setIsShowCreateGroupChat={setIsShowCreateGroupChat}/>}
                        {isShowEditGroupChat &&
                            <EditGroupChat setIsShowEditGroupChat={setIsShowEditGroupChat} currentChat={currentChat}/>}
                        {isShowProfile &&
                            <div className={styles.profileContainer}>
                                <Profile onCloseProfile={onCloseProfile} initials={initials}/>
                            </div>}
                        {!isShowCreateSingleChat && !isShowEditGroupChat && !isShowCreateGroupChat && !isShowProfile &&
                            <div className={styles.sideBarInnerContainer}>
                                <div className={styles.navContainer}>
                                    <div onClick={onOpenProfile} className={styles.userInfoContainer} style={{ cursor: 'pointer' }}>
                                        <Avatar sx={{
                                            width: '2.5rem',
                                            height: '2.5rem',
                                            fontSize: '1rem',
                                            mr: '0.75rem'
                                        }} src={authState.reqUser?.image || undefined}>
                                            {!authState.reqUser?.image && initials}
                                        </Avatar>
                                        <p>{authState.reqUser?.fullName}</p>
                                    </div>
                                    <div>
                                        <IconButton onClick={themeMode.toggleColorMode}>
                                            {themeMode.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                                        </IconButton>
                                        <IconButton onClick={onCreateSingleChat}>
                                            <ChatIcon/>
                                        </IconButton>
                                        <IconButton onClick={onOpenMenu}>
                                            <MoreVertIcon/>
                                        </IconButton>
                                        <Menu
                                            id="basic-menu"
                                            anchorEl={anchor}
                                            open={open}
                                            onClose={onCloseMenu}
                                            MenuListProps={{'aria-labelledby': 'basic-button'}}>
                                            <MenuItem onClick={onOpenProfile}>Profile</MenuItem>
                                            <MenuItem onClick={onCreateGroupChat}>Create Group</MenuItem>
                                            <MenuItem onClick={onLogout}>Logout</MenuItem>
                                        </Menu>
                                    </div>
                                </div>
                                <div className={styles.searchContainer}>
                                    <TextField
                                        id='search'
                                        type='text'
                                        label='Search your chats ...'
                                        size='small'
                                        fullWidth
                                        value={query}
                                        onChange={onChangeQuery}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position='start'>
                                                    <SearchIcon/>
                                                </InputAdornment>
                                            ),
                                            endAdornment: getSearchEndAdornment(),
                                        }}
                                        InputLabelProps={{
                                            shrink: focused || query.length > 0,
                                            style: {marginLeft: focused || query.length > 0 ? 0 : 30}
                                        }}
                                        onFocus={() => setFocused(true)}
                                        onBlur={() => setFocused(false)}/>
                                </div>
                                <div className={styles.chatsContainer}>
                                    {[...chatState.chats].sort((a, b) => {
                                        const lastMsgA = a.messages.length > 0 ? Math.max(...a.messages.map(m => +new Date(m.timeStamp))) : 0;
                                        const lastMsgB = b.messages.length > 0 ? Math.max(...b.messages.map(m => +new Date(m.timeStamp))) : 0;
                                        return lastMsgB - lastMsgA;
                                    }).filter(x => {
                                        if (query.length === 0) return true;
                                        return x.isGroup ? x.chatName.toLowerCase().includes(query) :
                                            x.users[0].id === authState.reqUser?.id ? x.users[1].fullName.toLowerCase().includes(query) :
                                                x.users[0].fullName.toLowerCase().includes(query);
                                    }).map((chat: ChatDTO) => (
                                        <div key={chat.id} onClick={() => onClickChat(chat)}>
                                            <Divider/>
                                            <ChatCard chat={chat}/>
                                        </div>
                                    ))}
                                    {chatState.chats?.length > 0 ? <Divider/> : null}
                                </div>
                            </div>}
                    </div>
                    <div className={styles.messagesContainer}>
                        {!currentChat && <WelcomePage reqUser={authState.reqUser}/>}
                        {currentChat && <MessagePage
                            chat={currentChat}
                            reqUser={authState.reqUser}
                            messages={messages}
                            newMessage={newMessage}
                            setNewMessage={setNewMessage}
                            onSendMessage={onSendMessage}
                            setIsShowEditGroupChat={setIsShowEditGroupChat}
                            setCurrentChat={setCurrentChat}/>}
                    </div>
                </div>
                {callState.isCalling && <CallModal stompClient={stompClient} isConnected={isConnected} />}
            </div>
            <Snackbar open={!!snackbarMessage} autoHideDuration={3000} onClose={() => setSnackbarMessage(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setSnackbarMessage(null)} severity="info" sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default Homepage;
