import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float } from '@react-three/drei';
import { 
  GameState, 
  Difficulty, 
  Customer, 
  Order, 
  Container, 
  Flavor, 
  Topping 
} from './types';
import { DIFFICULTY_SETTINGS, FLAVOR_COLORS } from './constants';
import { generateCustomerOrder } from './services/geminiService';
import { IceCream3D } from './components/IceCream3D';
import { Controls } from './components/Controls';
import { Confetti } from './components/Confetti';
import { CurrencyDollarIcon, TrophyIcon, Cog6ToothIcon, XMarkIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/solid';
import { playPopSound, playSuccessSound, playErrorSound, playGameOverSound, playFlavorSound, setVolumes, startMusic, stopMusic, setBPM } from './utils/soundUtils';

const HIGH_SCORE_KEY = 'scoops_high_scores_v1';
const SETTINGS_KEY = 'scoops_settings_v1';

const CircularTimer = ({ timeLeft, maxTime }: { timeLeft: number, maxTime: number }) => {
  const size = 56;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = timeLeft / maxTime;
  const strokeDashoffset = circumference - (progress * circumference);
  
  // Logic updated per request:
  // <= 10s: Red + Pulse
  // 10s < t <= 20s: Yellow
  // > 20s: Default Indigo
  const isCritical = timeLeft <= 10;
  const isWarning = timeLeft > 10 && timeLeft <= 20;
  
  let color = '#6366F1'; // Indigo-500
  let textColor = 'text-indigo-600';
  let wrapperBorderColor = 'border-white/50';
  let shadowClass = 'shadow-lg';
  let animationClass = '';
  let scaleClass = '';

  if (isWarning) {
      color = '#F59E0B'; // Amber-500
      textColor = 'text-amber-600';
      wrapperBorderColor = 'border-amber-400';
      shadowClass = 'shadow-amber-500/50';
      scaleClass = 'scale-105';
  }
  
  if (isCritical) {
      color = '#EF4444'; // Red-500
      textColor = 'text-red-600';
      wrapperBorderColor = 'border-red-400';
      shadowClass = 'shadow-red-500/50';
      animationClass = 'animate-pulse';
      scaleClass = 'scale-110';
  }

  // Wrapper classes
  const wrapperClass = `relative flex items-center justify-center bg-white/90 backdrop-blur rounded-full transition-transform duration-300 border-2 ${wrapperBorderColor} ${shadowClass} ${animationClass} ${scaleClass}`;

  return (
    <div className={wrapperClass}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          stroke="#E0E7FF"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-black font-mono leading-none text-xl transition-colors ${textColor}`}>
            {timeLeft}
        </span>
      </div>
    </div>
  );
};

const App = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.EASY);
  const [coins, setCoins] = useState(0);
  const [timer, setTimer] = useState(0);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [highScores, setHighScores] = useState<Record<string, number>>({ 
    [Difficulty.EASY]: 0,
    [Difficulty.MEDIUM]: 0,
    [Difficulty.HARD]: 0,
    [Difficulty.EXPERT]: 0,
    [Difficulty.MASTER]: 0
  });
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({ sfxVolume: 0.5, bgmVolume: 0.3 });

  // Building State
  const [currentContainer, setCurrentContainer] = useState<Container>(Container.CONE);
  const [currentLayers, setCurrentLayers] = useState<Flavor[]>([]);
  const [currentTopping, setCurrentTopping] = useState<Topping>(Topping.NONE);
  
  const [feedback, setFeedback] = useState<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load High Scores & Settings
  useEffect(() => {
    const savedScores = localStorage.getItem(HIGH_SCORE_KEY);
    if (savedScores) {
      try {
        setHighScores(prev => ({...prev, ...JSON.parse(savedScores)}));
      } catch (e) {
        console.error("Failed to parse high scores", e);
      }
    }

    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        setVolumes(parsed.sfxVolume, parsed.bgmVolume);
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    } else {
        setVolumes(0.5, 0.3); // Defaults
    }
  }, []);

  // Initialize Game Loop
  const startGame = (diff: Difficulty) => {
    // Play sound to unlock AudioContext
    playPopSound();
    
    // Reset music tempo
    setBPM(110);

    // Start music if not already playing and volume is > 0
    if (settings.bgmVolume > 0) {
        startMusic();
    }
    
    setDifficulty(diff);
    setCoins(0);
    setIsNewHighScore(false);
    setIsSuccess(false);
    setGameState(GameState.LOADING_ORDER);
  };

  const updateSettings = (newSettings: typeof settings) => {
      setSettings(newSettings);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      setVolumes(newSettings.sfxVolume, newSettings.bgmVolume);
      
      if (newSettings.bgmVolume > 0) {
          startMusic();
      } else {
          stopMusic();
      }
  };

  // Fetch Order
  useEffect(() => {
    if (gameState === GameState.LOADING_ORDER) {
      setFeedback("Here comes a customer...");
      setIsSuccess(false);
      const fetchOrder = async () => {
        try {
          const newCustomer = await generateCustomerOrder(difficulty);
          setCustomer(newCustomer);
          
          // Reset Build Area
          setCurrentContainer(Container.CONE);
          setCurrentLayers([]);
          setCurrentTopping(Topping.NONE);
          
          // Set Timer
          setTimer(DIFFICULTY_SETTINGS[difficulty].timeLimit);
          setGameState(GameState.PLAYING);
        } catch (e) {
          console.error(e);
          setFeedback("Customer got lost!");
          setTimeout(() => setGameState(GameState.MENU), 2000);
        }
      };
      fetchOrder();
    }
  }, [gameState, difficulty]);

  // Timer Logic
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
        // Increase urgency when time is low
        if (timer <= 10 && timer > 0) {
            setBPM(150);
        } else {
            setBPM(110);
        }
    }

    if (gameState === GameState.PLAYING && timer > 0) {
      timerRef.current = setTimeout(() => setTimer(t => t - 1), 1000);
    } else if (gameState === GameState.PLAYING && timer === 0) {
      handleGameOver();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timer, gameState]);

  const handleGameOver = () => {
    playGameOverSound();
    setBPM(110); // Reset tempo

    // Check High Score
    if (coins > (highScores[difficulty] || 0)) {
        const newHighScores = { ...highScores, [difficulty]: coins };
        setHighScores(newHighScores);
        localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(newHighScores));
        setIsNewHighScore(true);
    }

    setGameState(GameState.GAME_OVER);
    setFeedback("Out of time!");
  };

  // Building Logic
  const addFlavor = (f: Flavor) => {
    const max = DIFFICULTY_SETTINGS[difficulty].maxScoops + 1; // Allow 1 extra for mistakes
    if (currentLayers.length < max) {
      // Play unique sound for this flavor
      playFlavorSound(f);
      setCurrentLayers(prev => [...prev, f]);
    } else {
        playErrorSound();
        setFeedback("Too high! Use Trash.");
    }
  };

  const setContainerWithSound = (c: Container) => {
    playPopSound();
    setCurrentContainer(c);
  }

  const setToppingWithSound = (t: Topping) => {
    playPopSound();
    setCurrentTopping(t);
  }

  const handleServe = () => {
    if (!customer) return;

    setGameState(GameState.RESULT);
    
    // Validate
    const target = customer.order;
    const isContainerCorrect = target.container === currentContainer;
    const isToppingCorrect = target.topping === currentTopping;
    
    // Compare arrays
    const isLayersCorrect = target.layers.length === currentLayers.length && 
        target.layers.every((val, index) => val === currentLayers[index]);

    if (isContainerCorrect && isToppingCorrect && isLayersCorrect) {
      playSuccessSound();
      setIsSuccess(true);
      const reward = 10 * DIFFICULTY_SETTINGS[difficulty].coinMultiplier;
      setCoins(c => c + reward);
      setFeedback(`Perfect! +${reward} Coins!`);
      setTimeout(() => setGameState(GameState.LOADING_ORDER), 2000);
    } else {
      playErrorSound();
      setIsSuccess(false);
      setFeedback("Wrong Order! Game Over.");
      setTimeout(() => handleGameOver(), 2000);
    }
  };

  // Renderers
  const renderSettingsModal = () => (
      <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm animate-pop-in border-4 border-indigo-100">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-display text-indigo-800 flex items-center gap-2">
                      <Cog6ToothIcon className="h-8 w-8 text-indigo-500"/> Settings
                  </h2>
                  <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600">
                      <XMarkIcon className="h-8 w-8" />
                  </button>
              </div>

              <div className="space-y-6">
                  {/* SFX Volume */}
                  <div>
                      <div className="flex justify-between mb-2">
                          <label className="font-bold text-gray-600 flex items-center gap-2">
                              {settings.sfxVolume > 0 ? <SpeakerWaveIcon className="h-5 w-5"/> : <SpeakerXMarkIcon className="h-5 w-5"/>}
                              Sound Effects
                          </label>
                          <span className="text-indigo-600 font-mono font-bold">{Math.round(settings.sfxVolume * 100)}%</span>
                      </div>
                      <input 
                          type="range" 
                          min="0" max="1" step="0.05"
                          value={settings.sfxVolume}
                          onChange={(e) => updateSettings({...settings, sfxVolume: parseFloat(e.target.value)})}
                          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                      />
                  </div>

                  {/* Music Volume */}
                  <div>
                      <div className="flex justify-between mb-2">
                          <label className="font-bold text-gray-600 flex items-center gap-2">
                              {settings.bgmVolume > 0 ? <SpeakerWaveIcon className="h-5 w-5"/> : <SpeakerXMarkIcon className="h-5 w-5"/>}
                              Music
                          </label>
                          <span className="text-indigo-600 font-mono font-bold">{Math.round(settings.bgmVolume * 100)}%</span>
                      </div>
                      <input 
                          type="range" 
                          min="0" max="1" step="0.05"
                          value={settings.bgmVolume}
                          onChange={(e) => updateSettings({...settings, bgmVolume: parseFloat(e.target.value)})}
                          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400"
                      />
                  </div>
              </div>

              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-full mt-8 bg-indigo-500 text-white py-3 rounded-xl font-bold hover:bg-indigo-600 transition-colors"
              >
                  Done
              </button>
          </div>
      </div>
  );

  const renderMenu = () => (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-pink-300 via-purple-300 to-indigo-400 p-4 overflow-y-auto">
      <div className="bg-white p-6 rounded-3xl shadow-2xl text-center max-w-2xl w-full border-4 border-white/50 my-auto relative">
        <h1 className="text-5xl font-display text-pink-600 mb-2 drop-shadow-sm">Scoops & Smiles</h1>
        <p className="text-gray-500 mb-6 font-bold text-lg">Serve AI customers before they melt!</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {Object.values(Difficulty).map(d => (
            <button
              key={d}
              onClick={() => startGame(d)}
              className="py-4 text-lg font-black text-white rounded-2xl shadow-lg transition-transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center relative overflow-hidden group"
              style={{
                background: 
                    d === Difficulty.EASY ? '#4ADE80' : 
                    d === Difficulty.MEDIUM ? '#FBBF24' : 
                    d === Difficulty.HARD ? '#F87171' : 
                    d === Difficulty.EXPERT ? '#C084FC' : '#6366F1'
              }}
            >
              <span className="relative z-10">{d.toUpperCase()}</span>
               {/* Only show badge if there is a high score */}
               {highScores[d] > 0 && (
                 <span className="mt-1 text-xs bg-black/20 px-2 py-0.5 rounded-full text-white flex items-center gap-1 relative z-10">
                    <TrophyIcon className="h-3 w-3" /> {highScores[d]}
                 </span>
              )}
            </button>
          ))}
        </div>

        {/* Scoreboard */}
        <div className="bg-indigo-50 rounded-2xl p-4 border-2 border-indigo-100 mb-4">
            <h3 className="text-indigo-900 font-bold uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
                <TrophyIcon className="h-5 w-5 text-yellow-500" /> High Scores
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.values(Difficulty).map(d => (
                    <div key={d} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-indigo-100">
                        <span className="text-gray-600 font-bold">{d}</span>
                        <span className="font-mono font-black text-indigo-600">{highScores[d]}</span>
                    </div>
                ))}
            </div>
        </div>

        <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center justify-center gap-2 mx-auto text-gray-500 hover:text-indigo-600 font-bold px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
            <Cog6ToothIcon className="h-5 w-5" /> Settings
        </button>
      </div>
    </div>
  );

  const renderGameOver = () => (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4">
       <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md w-full animate-bounce-in relative overflow-hidden">
          {isNewHighScore && (
              <div className="absolute top-0 left-0 right-0 bg-yellow-400 text-yellow-900 font-black text-center py-1 uppercase tracking-widest text-sm animate-pulse">
                  New High Score!
              </div>
          )}
          
          <h2 className="text-4xl font-display text-red-500 mb-4 mt-4">Shift Over!</h2>
          <p className="text-2xl font-bold text-gray-700 mb-2">{feedback}</p>
          
          <div className={`p-4 rounded-xl mb-6 border-2 ${isNewHighScore ? 'bg-yellow-50 border-yellow-400' : 'bg-gray-50 border-gray-200'}`}>
            <span className="text-sm uppercase text-gray-500 font-bold">Total Earnings</span>
            <div className="text-5xl font-black text-gray-800 flex items-center justify-center gap-2 my-2">
                <CurrencyDollarIcon className="h-10 w-10 text-green-500" /> {coins}
            </div>
            {isNewHighScore && (
                <div className="text-yellow-600 font-bold text-sm">
                    🏆 You beat your previous best!
                </div>
            )}
          </div>
          
          <button 
            onClick={() => setGameState(GameState.MENU)}
            className="w-full bg-indigo-500 text-white py-4 rounded-xl font-bold text-xl hover:bg-indigo-600 transition-colors shadow-lg hover:shadow-indigo-500/30"
          >
            Back to Menu
          </button>
       </div>
    </div>
  );

  return (
    <div className="w-full h-screen relative bg-gradient-to-b from-blue-200 to-blue-50 overflow-hidden">
      
      {/* Settings Modal */}
      {isSettingsOpen && renderSettingsModal()}

      {/* Confetti Overlay */}
      {isSuccess && gameState === GameState.RESULT && <Confetti />}

      {/* 3D Scene Background */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 1, 5], fov: 45 }}>
          <Environment preset="sunset" />
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          
          <Suspense fallback={null}>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                <IceCream3D 
                    container={currentContainer}
                    layers={currentLayers}
                    topping={currentTopping}
                    isAnimating={gameState === GameState.RESULT}
                    isSuccess={isSuccess}
                />
            </Float>
            <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
          </Suspense>
          <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 3} />
        </Canvas>
      </div>

      {/* UI Overlay */}
      {gameState === GameState.MENU && renderMenu()}
      {gameState === GameState.GAME_OVER && renderGameOver()}

      {/* Gameplay HUD */}
      {(gameState === GameState.PLAYING || gameState === GameState.RESULT || gameState === GameState.LOADING_ORDER) && (
        <div className="relative z-10 h-full flex flex-col justify-between p-4 pointer-events-none">
            
            {/* Top Bar */}
            <div className="flex justify-between items-start pointer-events-auto">
                <div className="bg-white/90 backdrop-blur rounded-2xl p-3 shadow-lg flex items-center gap-3 border border-white/50">
                     <div className="bg-yellow-400 p-2 rounded-xl text-white shadow-sm">
                        <CurrencyDollarIcon className="h-6 w-6" />
                     </div>
                     <div>
                        <div className="text-xs font-bold text-gray-400 uppercase">Coins</div>
                        <div className="text-xl font-black text-gray-700 leading-none">{coins}</div>
                     </div>
                </div>

                <div className="flex gap-2">
                     <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="bg-white/90 backdrop-blur rounded-2xl p-3 shadow-lg flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-white transition-all border border-white/50"
                     >
                        <Cog6ToothIcon className="h-6 w-6" />
                     </button>

                    {gameState === GameState.PLAYING && (
                        <CircularTimer 
                            timeLeft={timer} 
                            maxTime={DIFFICULTY_SETTINGS[difficulty].timeLimit} 
                        />
                    )}
                </div>
            </div>

            {/* Customer Order Bubble */}
            {customer && gameState !== GameState.LOADING_ORDER && (
                <div className="absolute top-20 right-4 max-w-[200px] pointer-events-auto z-20">
                    <div className={`bg-white/95 backdrop-blur rounded-tr-3xl rounded-tl-3xl rounded-bl-3xl shadow-xl p-4 border-4 transition-all duration-300 animate-slide-in ${isSuccess && gameState === GameState.RESULT ? 'border-green-400 scale-105' : 'border-indigo-100'}`}>
                        <div className="flex items-center gap-2 mb-2">
                             <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center text-lg shadow-inner">😃</div>
                             <span className="font-bold text-indigo-900 truncate">{customer.name}</span>
                        </div>
                        <p className="text-sm text-gray-600 italic mb-3 leading-tight">"{customer.dialogue}"</p>
                        
                        <div className="space-y-1 text-sm bg-gray-50 p-2 rounded-lg border border-gray-100">
                             <div className="flex justify-between">
                                <span className="text-gray-400 text-xs uppercase font-bold">Base</span>
                                <span className="font-bold text-gray-700">{customer.order.container}</span>
                             </div>
                             <div className="flex justify-between">
                                <span className="text-gray-400 text-xs uppercase font-bold">Top</span>
                                <span className="font-bold text-pink-500">{customer.order.topping}</span>
                             </div>
                             <div className="border-t border-gray-200 my-1 pt-1">
                                <div className="text-gray-400 text-xs mb-1 uppercase font-bold">Stack</div>
                                <div className="flex flex-col-reverse gap-1">
                                    {customer.order.layers.map((l, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{backgroundColor: FLAVOR_COLORS[l as Flavor]}}></div>
                                            <span className="font-bold text-gray-700 text-xs">{l}</span>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Centered Feedback/Loading */}
            {(gameState === GameState.LOADING_ORDER || gameState === GameState.RESULT) && (
                 <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 w-full text-center px-4">
                      <div className={`inline-block backdrop-blur-md text-white px-8 py-4 rounded-3xl text-2xl font-bold animate-bounce shadow-2xl border-2 border-white/20 ${isSuccess ? 'bg-green-500/80' : 'bg-black/70'}`}>
                          {gameState === GameState.LOADING_ORDER ? "Next Customer..." : feedback}
                      </div>
                 </div>
            )}

            {/* Controls */}
            <div className="mb-4">
                {gameState === GameState.PLAYING && (
                    <Controls 
                        onAddFlavor={addFlavor}
                        onSetContainer={setContainerWithSound}
                        onSetTopping={setToppingWithSound}
                        onClear={() => { 
                            playPopSound();
                            setCurrentLayers([]); 
                            setCurrentTopping(Topping.NONE); 
                        }}
                        onSubmit={handleServe}
                        currentContainer={currentContainer}
                        currentTopping={currentTopping}
                        isProcessing={gameState !== GameState.PLAYING}
                    />
                )}
            </div>
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-1 w-full text-center z-50 pointer-events-auto pb-1">
          <p className="text-[10px] font-bold text-gray-500/80 drop-shadow-sm uppercase tracking-wider">
              (C) Noam Gold AI 2025
          </p>
          <a href="mailto:gold.noam@gmail.com" className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors">
              Send Feedback: gold.noam@gmail.com
          </a>
      </div>
    </div>
  );
};

export default App;