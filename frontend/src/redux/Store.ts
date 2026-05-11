import authReducer from "./auth/AuthReducer";
import {combineReducers} from "redux";
import {configureStore} from "@reduxjs/toolkit";
import chatReducer from "./chat/ChatReducer";
import messageReducer from "./message/MessageReducer";
import {callReducer} from "./call/CallReducer";

const rootReducer = combineReducers({
    auth: authReducer,
    chat: chatReducer,
    message: messageReducer,
    call: callReducer
});

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
            immutableCheck: false,
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
