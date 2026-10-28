import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, getToken, setToken, removeToken } from '../services/api';
import { STORAGE_KEYS } from '../constants/config';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return { ...state, user: action.payload.user, token: action.payload.token, isAuthenticated: true, isLoading: false, error: null };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'UPDATE_USER':
      return { ...state, user: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  async function restoreSession() {
    try {
      const token = await getToken();
      const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (token && userStr) {
        const user = JSON.parse(userStr);
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }

    } catch {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }

  // Restore session on mount
  useEffect(() => {
    restoreSession();
  }, []);

  const login = async (email, password) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const data = await authAPI.login({ email, password });
      await setToken(data.token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
      dispatch({ type: 'LOGIN_SUCCESS', payload: data });
      return { success: true };
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
      return { success: false, message: err.message };
    }
  };

  const register = async (username, email, password) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const data = await authAPI.register({ username, email, password });
      await setToken(data.token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
      dispatch({ type: 'LOGIN_SUCCESS', payload: data });
      return { success: true };
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
      return { success: false, message: err.message };
    }
  };

  const logout = async () => {
    await removeToken();
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = async (userData) => {
    try {
      const data = await authAPI.updateProfile(userData);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
      dispatch({ type: 'UPDATE_USER', payload: data.user });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const loginWithGoogle = async (googleUserData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const data = await authAPI.googleLogin(googleUserData);
      await setToken(data.token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
      dispatch({ type: 'LOGIN_SUCCESS', payload: data });
      return { success: true, user: data.user };
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
      return { success: false, message: err.message };
    }
  };

  const clearError = () => dispatch({ type: 'SET_ERROR', payload: null });

  return (
    <AuthContext.Provider value={{ ...state, login, register, loginWithGoogle, logout, updateUser, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
