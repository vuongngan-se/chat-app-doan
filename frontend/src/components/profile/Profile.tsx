import React, {Dispatch, useEffect, useState} from "react";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "../../redux/Store";
import {AuthReducerState, UpdateUserRequestDTO} from "../../redux/auth/AuthModel";
import {TOKEN} from "../../config/Config";
import {currentUser, updateUser} from "../../redux/auth/AuthAction";
import WestIcon from '@mui/icons-material/West';
import {Avatar, IconButton, TextField} from "@mui/material";
import CreateIcon from '@mui/icons-material/Create';
import CheckIcon from '@mui/icons-material/Check';
import styles from './Profile.module.scss';
import CloseIcon from '@mui/icons-material/Close';


interface ProfileProps {
    onCloseProfile: () => void;
    initials: string;
}

const Profile = (props: ProfileProps) => {

    const [isEditName, setIsEditName] = useState<boolean>(false);
    const [fullName, setFullName] = useState<string | null>(null);
    const [isEditImage, setIsEditImage] = useState<boolean>(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const dispatch: Dispatch<any> = useDispatch();
    const auth: AuthReducerState = useSelector((state: RootState) => state.auth);
    const token: string | null = localStorage.getItem(TOKEN);

    useEffect(() => {
        if (auth.reqUser) {
            setFullName(auth.reqUser.fullName);
            setImageUrl(auth.reqUser.image || null);
        }
    }, [auth.reqUser]);

    useEffect(() => {
        if (token && auth.updateUser) {
            dispatch(currentUser(token));
        }
    }, [auth.updateUser, token, dispatch]);

    const onEditName = () => {
        setIsEditName(true);
    };

    const onEditImage = () => {
        setIsEditImage(true);
    }

    const onUpdateUser = () => {
        if (fullName && token) {
            const data: UpdateUserRequestDTO = {
                fullName: fullName,
                image: imageUrl || undefined
            };
            dispatch(updateUser(data, token));
            setIsEditName(false);
            setIsEditImage(false);
        }
    };

    const onCancelUpdate = () => {
        if (auth.reqUser) {
            setFullName(auth.reqUser?.fullName);
            setImageUrl(auth.reqUser?.image || null);
        }
        setIsEditName(false);
        setIsEditImage(false);
    };

    const onChangeFullName = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        setFullName(e.target.value);
    };

    const onChangeImageUrl = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        setImageUrl(e.target.value);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setImageUrl(base64String);
                // Tự động lưu luôn khi chọn ảnh xong
                if (fullName && token) {
                    const data: UpdateUserRequestDTO = {
                        fullName: fullName,
                        image: base64String
                    };
                    dispatch(updateUser(data, token));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className={styles.outerContainer}>
            <div className={styles.headingContainer}>
                <IconButton onClick={props.onCloseProfile}>
                    <WestIcon fontSize='medium'/>
                </IconButton>
                <h2>Profile</h2>
            </div>
            <div className={styles.avatarContainer}>
                <label htmlFor="file-input">
                    <Avatar sx={{width: '12vw', height: '12vw', fontSize: '5vw', cursor: 'pointer'}} src={auth.reqUser?.image || undefined}>
                        {!auth.reqUser?.image && props.initials}
                    </Avatar>
                </label>
                <input
                    id="file-input"
                    type="file"
                    accept="image/*"
                    style={{display: 'none'}}
                    onChange={handleFileChange}
                />
                <IconButton sx={{mt: -4, ml: 10, backgroundColor: 'white', '&:hover': {backgroundColor: '#eee'}}} onClick={onEditImage}>
                    <CreateIcon fontSize="small"/>
                </IconButton>
            </div>

            {isEditImage && (
                <div className={styles.nameContainer} style={{marginBottom: '1rem'}}>
                    <div className={styles.innerNameDynamicContainer}>
                        <TextField
                            id="imageUrl"
                            type="text"
                            label="Avatar URL (e.g. https://...)"
                            variant="outlined"
                            onChange={onChangeImageUrl}
                            value={imageUrl || ''}
                            sx={{ml: '0.75rem', width: '70%'}}/>
                        <div>
                            <IconButton onClick={onCancelUpdate}>
                                <CloseIcon/>
                            </IconButton>
                            <IconButton sx={{mr: '0.75rem'}} onClick={onUpdateUser}>
                                <CheckIcon/>
                            </IconButton>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.nameContainer}>
                {!isEditName &&
                    <div className={styles.innerNameStaticContainer}>
                        <p className={styles.nameDistance}>{auth.reqUser?.fullName}</p>
                        <IconButton sx={{mr: '0.75rem'}} onClick={onEditName}>
                            <CreateIcon/>
                        </IconButton>
                    </div>}
                {isEditName &&
                    <div className={styles.innerNameDynamicContainer}>
                        <TextField
                            id="fullName"
                            type="text"
                            label="Enter your full name"
                            variant="outlined"
                            onChange={onChangeFullName}
                            value={fullName || ''}
                            sx={{ml: '0.75rem', width: '70%'}}/>
                        <div>
                            <IconButton onClick={onCancelUpdate}>
                                <CloseIcon/>
                            </IconButton>
                            <IconButton sx={{mr: '0.75rem'}} onClick={onUpdateUser}>
                                <CheckIcon/>
                            </IconButton>
                        </div>
                    </div>}
            </div>
            <div className={styles.infoContainer}>
                <p className={styles.infoText}>This name will appear on your messages</p>
            </div>
        </div>
    );
};

export default Profile;