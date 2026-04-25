// App.jsx
import {useEffect, useState} from 'react';
import ArenaGame from "./components/ArenaGame";
import { useGameStore } from "./stores/gameStore";
import { audioManager } from "./game/utils/audioManager.js";
import "./index.css";
import LoadingScreen from "./components/LoadingScreen.jsx";

window.audioManager = audioManager;

// Sync store -> audio manager
const unsubscribe = useGameStore.subscribe((state) => {
  if (state.audio) {
    audioManager.setMuted(state.audio.isMuted);
    audioManager.setMusicVolume(state.audio.musicVolume);
    audioManager.setSfxVolume(state.audio.sfxVolume);
  }
});

// Initial sync
const initialState = useGameStore.getState();
if (initialState.audio) {
  audioManager.setMuted(initialState.audio.isMuted);
  audioManager.setMusicVolume(initialState.audio.musicVolume);
  audioManager.setSfxVolume(initialState.audio.sfxVolume);
}

document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
  e.stopPropagation();
  return false;
});


export default function App() {
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  const handleAssetsLoaded = () => {
    setAssetsLoaded(true);
  };

  useEffect(() => {
    return () => unsubscribe();
  }, []);

  if (!assetsLoaded) {
    return <LoadingScreen onComplete={handleAssetsLoaded} />;
  }

  return <ArenaGame />;
}