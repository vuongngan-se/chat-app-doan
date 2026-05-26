import ForumIcon from "@mui/icons-material/Forum";
import React from "react";
import {UserDTO} from "../../redux/auth/AuthModel";
import styles from './WelcomePage.module.scss';

interface WelcomePageProps {
    reqUser: UserDTO | null;
}

const WelcomePage = (props: WelcomePageProps) => {
    return (
        <div className={styles.welcomeContainer}>
            <div className={styles.innerWelcomeContainer}>
                <ForumIcon sx={{
                    width: '7rem',
                    height: '7rem',
                }}/>
                <h1>Welcome, {props.reqUser?.fullName}!</h1>
                <p>Select a conversation from the sidebar or start a new chat to connect with friends instantly.</p>
                <div className={styles.startHint}>Nicolas Messenger v2.0</div>
            </div>
        </div>
    );
};

export default WelcomePage;