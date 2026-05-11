import React, { createContext, useState, useMemo, useEffect } from 'react';
import {Route, Routes} from "react-router-dom";
import Homepage from "./components/Homepage";
import SignIn from "./components/register/SignIn";
import SignUp from "./components/register/SignUp";
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

export const ThemeModeContext = createContext({
    toggleColorMode: () => {},
    mode: 'light' as 'light' | 'dark'
});

function App() {
    const [mode, setMode] = useState<'light' | 'dark'>('light');

    const colorMode = useMemo(() => ({
        toggleColorMode: () => {
            setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
        },
        mode
    }), [mode]);

    const theme = useMemo(() => createTheme({
        palette: {
            mode,
            ...(mode === 'dark' ? {
                background: {
                    default: '#121212',
                    paper: '#1e1e1e',
                }
            } : {})
        },
    }), [mode]);

    useEffect(() => {
        if (mode === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [mode]);

    return (
        <ThemeModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <div>
                    <Routes>
                        <Route path="/" element={<Homepage/>}/>
                        <Route path='/signin' element={<SignIn/>}/>
                        <Route path='/signup' element={<SignUp/>}/>
                    </Routes>
                </div>
            </ThemeProvider>
        </ThemeModeContext.Provider>
    );
}

export default App;
