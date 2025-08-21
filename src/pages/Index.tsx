import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Mission {
  selected: boolean;
  count: number;
  completed: number;
}

interface Missions {
  followers: Mission;
  likes: Mission;
  comments: Mission;
}

const Index = () => {
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [missions, setMissions] = useState<Missions>({
    followers: { selected: false, count: 0, completed: 0 },
    likes: { selected: false, count: 0, completed: 0 },
    comments: { selected: false, count: 0, completed: 0 }
  });
  const [followCompleted, setFollowCompleted] = useState(false);
  const [username, setUsername] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [videoLinkError, setVideoLinkError] = useState(false);
  const [showUsernameSection, setShowUsernameSection] = useState(false);
  const [showVideoSection, setShowVideoSection] = useState(false);
  const [showMissionsSection, setShowMissionsSection] = useState(false);
  const [showFollowSection, setShowFollowSection] = useState(false);
  const [showSendSection, setShowSendSection] = useState(false);
  const [warningModal, setWarningModal] = useState(false);
  const [duplicateModal, setDuplicateModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [duplicateMissionType, setDuplicateMissionType] = useState('');
  const [followersUsedCount, setFollowersUsedCount] = useState(0);
  const [alreadyFollowed, setAlreadyFollowed] = useState(false);
  const [resetCountdown, setResetCountdown] = useState('--:--:--');
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const platformLinks = {
    instagram: 'https://www.instagram.com/imdannyc4u/',
    tiktok: 'https://www.tiktok.com/@dannycross443',
    youtube: 'https://www.youtube.com/@mami4u5'
  };

  // Load used combinations from localStorage
  const getUsedCombinations = () => {
    return JSON.parse(localStorage.getItem('turnoUsedCombinations') || '{}');
  };

  const setUsedCombinations = (combinations: any) => {
    localStorage.setItem('turnoUsedCombinations', JSON.stringify(combinations));
  };

  const cleanupExpiredEntries = () => {
    const now = Date.now();
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    const usedCombinations = getUsedCombinations();
    
    Object.keys(usedCombinations).forEach(key => {
      if (key.includes('_followers_')) {
        const entry = usedCombinations[key];
        
        if (typeof entry === 'boolean') {
          usedCombinations[key] = {
            timestamp: now,
            used: true
          };
        } else if (entry && entry.timestamp) {
          if (now - entry.timestamp > twoHoursInMs) {
            delete usedCombinations[key];
          }
        }
      }
    });
    
    setUsedCombinations(usedCombinations);
  };

  const updateFollowersUsageCounter = () => {
    if (!selectedPlatform || !username.trim()) {
      setFollowersUsedCount(0);
      return;
    }
    
    cleanupExpiredEntries();
    const usedCombinations = getUsedCombinations();
    const usernameLower = username.trim().toLowerCase();
    
    let totalUsed = 0;
    Object.keys(usedCombinations).forEach(key => {
      if (key.startsWith(`${selectedPlatform}_${usernameLower}_followers_`)) {
        const entry = usedCombinations[key];
        if (entry && typeof entry === 'object' && entry.timestamp) {
          const count = parseInt(key.split('_').pop() || '0');
          totalUsed += count;
        }
      }
    });
    
    setFollowersUsedCount(totalUsed);
  };

  useEffect(() => {
    updateFollowersUsageCounter();
  }, [selectedPlatform, username]);

  const selectPlatform = (platform: string) => {
    setSelectedPlatform(platform);
    setMissions({
      followers: { selected: false, count: 0, completed: 0 },
      likes: { selected: false, count: 0, completed: 0 },
      comments: { selected: false, count: 0, completed: 0 }
    });
    setFollowCompleted(false);
    setUsername('');
    setVideoLink('');
    setShowUsernameSection(true);
    setShowVideoSection(false);
    setShowMissionsSection(false);
    setShowFollowSection(false);
    setShowSendSection(false);
    setAlreadyFollowed(false);
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (value.trim()) {
      setShowVideoSection(true);
      setShowMissionsSection(true);
      setShowFollowSection(true);
    } else {
      setShowVideoSection(false);
      setShowMissionsSection(false);
      setShowFollowSection(false);
      setShowSendSection(false);
      setVideoLink('');
    }
  };

  const isValidUrl = (string: string) => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  const validateVideoLink = (value: string) => {
    if (value && !isValidUrl(value)) {
      setVideoLinkError(true);
      return false;
    } else {
      setVideoLinkError(false);
      return true;
    }
  };

  const selectMission = (type: keyof Missions, count: number) => {
    if (missions[type].selected && missions[type].count === count) {
      setMissions(prev => ({
        ...prev,
        [type]: { selected: false, count: 0, completed: 0 }
      }));
      return;
    }
    
    const usernameLower = username.trim().toLowerCase();
    const combinationKey = `${selectedPlatform}_${usernameLower}_${type}_${count}`;
    
    if (type === 'followers') {
      cleanupExpiredEntries();
      const usedCombinations = getUsedCombinations();
      const entry = usedCombinations[combinationKey];
      if (entry && typeof entry === 'object' && entry.timestamp) {
        setDuplicateMissionType(type);
        setDuplicateModal(true);
        startResetCountdown(entry.timestamp);
        return;
      }
    }
    
    setMissions(prev => ({
      ...prev,
      [type]: { selected: true, count, completed: 0 }
    }));
  };

  const completeMissionAction = (type: keyof Missions, actionNumber: number) => {
    setMissions(prev => ({
      ...prev,
      [type]: { ...prev[type], completed: prev[type].completed + 1 }
    }));
  };

  const getTotalProgress = () => {
    const selectedMissions = Object.values(missions).filter(m => m.selected);
    if (selectedMissions.length === 0) return 0;

    const totalTasks = selectedMissions.reduce((sum, m) => sum + Math.floor(m.count / 2), 0);
    const completedTasks = selectedMissions.reduce((sum, m) => sum + m.completed, 0);
    return Math.round((completedTasks / totalTasks) * 100);
  };

  const checkSendButton = () => {
    const allMissionsCompleted = Object.values(missions).every(mission => 
      !mission.selected || mission.completed === Math.floor(mission.count / 2)
    );
    
    const anyMissionSelected = Object.values(missions).some(mission => mission.selected);
    
    if (allMissionsCompleted && anyMissionSelected && followCompleted) {
      setShowSendSection(true);
    } else {
      setShowSendSection(false);
    }
  };

  useEffect(() => {
    checkSendButton();
  }, [missions, followCompleted]);

  const followAccount = () => {
    setWarningModal(true);
    setTimeout(() => {
      window.open(platformLinks[selectedPlatform as keyof typeof platformLinks], '_blank');
      setFollowCompleted(true);
    }, 100);
  };

  const handleAlreadyFollowed = (checked: boolean) => {
    setAlreadyFollowed(checked);
    if (checked) {
      setWarningModal(true);
      setTimeout(() => {
        setFollowCompleted(true);
      }, 100);
    } else {
      setFollowCompleted(false);
    }
  };

  const startResetCountdown = (timestamp: number) => {
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    const updateCountdown = () => {
      const now = Date.now();
      const resetTime = timestamp + twoHoursInMs;
      const timeLeft = resetTime - now;
      
      if (timeLeft <= 0) {
        setResetCountdown('00:00:00');
        setTimeout(() => {
          setDuplicateModal(false);
          updateFollowersUsageCounter();
        }, 1000);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        return;
      }
      
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      setResetCountdown(formattedTime);
    };
    
    updateCountdown();
    countdownIntervalRef.current = setInterval(updateCountdown, 1000);
  };

  const sendMissions = async () => {
    try {
      const usernameLower = username.trim().toLowerCase();
      const now = Date.now();
      const usedCombinations = getUsedCombinations();
      
      // Save to Supabase database
      const { error } = await supabase
        .from('user_submissions')
        .insert({
          platform: selectedPlatform,
          username: usernameLower,
          video_link: videoLink || null,
          follow_account: platformLinks[selectedPlatform as keyof typeof platformLinks],
          follow_completed: followCompleted,
          missions_data: missions as any,
          ip_address: null, // Will be filled by backend if needed
          user_agent: navigator.userAgent
        });

      if (error) {
        console.error('Error saving submission:', error);
        return;
      }
      
      // Update localStorage for follower tracking
      Object.keys(missions).forEach(type => {
        if (missions[type as keyof Missions].selected && type === 'followers') {
          const combinationKey = `${selectedPlatform}_${usernameLower}_${type}_${missions[type as keyof Missions].count}`;
          usedCombinations[combinationKey] = {
            timestamp: now,
            used: true
          };
        }
      });
      setUsedCombinations(usedCombinations);
      
      updateFollowersUsageCounter();
      setSuccessModal(true);
    } catch (error) {
      console.error('Error submitting missions:', error);
    }
  };

  const renderMissionButtons = (type: keyof Missions) => {
    if (!missions[type].selected) return null;
    
    const buttonCount = Math.floor(missions[type].count / 2);
    const buttons = [];
    
    for (let i = 1; i <= buttonCount; i++) {
      const isCompleted = i <= missions[type].completed;
      buttons.push(
        <button
          key={i}
          className={`action-button px-3 py-2 rounded-lg text-sm font-medium ${isCompleted ? 'completed' : ''}`}
          onClick={() => !isCompleted && completeMissionAction(type, i)}
        >
          {isCompleted ? '✓ Done' : `Task ${i}`}
        </button>
      );
    }
    
    return buttons;
  };

  const getProgressPercentage = (type: keyof Missions) => {
    if (!missions[type].selected) return 0;
    return (missions[type].completed / Math.floor(missions[type].count / 2)) * 100;
  };

  const getSelectedServices = () => {
    const services = [];
    if (missions.followers.selected) services.push('Follow');
    if (missions.likes.selected) services.push('Like');
    if (missions.comments.selected) services.push('Comment');
    return services;
  };

  return (
    <div className="text-white min-h-screen">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="floating-icon mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center text-3xl">
              🚀
            </div>
          </div>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">
            Turno
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Grow your social media presence with targeted missions. Complete tasks, gain followers, and unlock rewards across all major platforms.
          </p>
        </div>

        {/* Platform Selection */}
        <div className="glass-card rounded-3xl p-8 mb-8 neon-glow">
          <h2 className="text-3xl font-bold text-white mb-2">Choose Your Platform</h2>
          <p className="text-gray-400 mb-8">Select the social media platform you want to grow</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* YouTube */}
            <div 
              onClick={() => selectPlatform('youtube')} 
              className={`platform-card glass-card rounded-2xl p-6 text-center cursor-pointer ${selectedPlatform === 'youtube' ? 'selected' : ''}`}
            >
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-12 h-12 fill-red-500">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">YouTube</h3>
              <p className="text-gray-400 text-sm">Grow your channel with views, subscribers, and engagement</p>
            </div>

            {/* TikTok */}
            <div 
              onClick={() => selectPlatform('tiktok')} 
              className={`platform-card glass-card rounded-2xl p-6 text-center cursor-pointer ${selectedPlatform === 'tiktok' ? 'selected' : ''}`}
            >
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-12 h-12">
                  <path fill="#ff0050" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">TikTok</h3>
              <p className="text-gray-400 text-sm">Boost your videos with views, likes, and followers</p>
            </div>

            {/* Instagram */}
            <div 
              onClick={() => selectPlatform('instagram')} 
              className={`platform-card glass-card rounded-2xl p-6 text-center cursor-pointer ${selectedPlatform === 'instagram' ? 'selected' : ''}`}
            >
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-12 h-12">
                  <defs>
                    <radialGradient id="instagram-gradient" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" style={{stopColor:'#fdf497'}}/>
                      <stop offset="5%" style={{stopColor:'#fdf497'}}/>
                      <stop offset="45%" style={{stopColor:'#fd5949'}}/>
                      <stop offset="60%" style={{stopColor:'#d6249f'}}/>
                      <stop offset="90%" style={{stopColor:'#285AEB'}}/>
                    </radialGradient>
                  </defs>
                  <path fill="url(#instagram-gradient)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Instagram</h3>
              <p className="text-gray-400 text-sm">Increase your posts' reach with likes, comments, and followers</p>
            </div>
          </div>

          {/* Username Section */}
          {showUsernameSection && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block text-white font-medium mb-3">Enter your profile information</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="Username or profile link..." 
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Video Links Section */}
              {showVideoSection && (
                <div>
                  <label className="block text-white font-medium mb-3">
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-2 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 6l-8-4v8l8-4z"/>
                      </svg>
                      Add your video/reel link
                    </span>
                  </label>
                  <div className="relative">
                    <input 
                      type="url" 
                      value={videoLink}
                      onChange={(e) => {
                        setVideoLink(e.target.value);
                        validateVideoLink(e.target.value);
                      }}
                      placeholder="https://... (Video/Reel link)" 
                      className={`w-full p-4 bg-white/10 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all ${videoLinkError ? 'border-red-500' : 'border-white/20'}`}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                      </svg>
                    </div>
                  </div>
                  {videoLinkError && (
                    <div className="mt-2 text-red-400 text-sm">
                      ⚠️ Please enter a valid link (must start with http:// or https://)
                    </div>
                  )}
                  <p className="text-sm text-gray-400 mt-3">
                    💡 Paste the direct link to your video or reel for targeted growth
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Missions Section */}
        {showMissionsSection && (
          <div className="glass-card rounded-3xl p-8 mb-8 neon-glow">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Mission Control</h2>
                <p className="text-gray-400">Select your growth targets and complete the actions</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-cyan-400">{getTotalProgress()}%</div>
                <div className="text-sm text-gray-400">Complete</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Followers */}
              <div className="mission-category">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white">Followers</h3>
                  </div>
                  <div className="text-sm text-gray-400 bg-white/5 px-3 py-1 rounded-lg">
                    Used: <span className="text-cyan-400 font-medium">{followersUsedCount}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[10, 20, 50, 100].map(count => (
                    <button 
                      key={count}
                      onClick={() => selectMission('followers', count)}
                      className={`mission-button px-4 py-3 rounded-lg font-medium text-sm ${missions.followers.selected && missions.followers.count === count ? 'completed' : ''}`}
                    >
                      {count} Followers
                    </button>
                  ))}
                </div>
                {missions.followers.selected && (
                  <div className="progress-bar h-2 mb-3">
                    <div className="progress-fill" style={{width: `${getProgressPercentage('followers')}%`}}></div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {renderMissionButtons('followers')}
                </div>
              </div>

              {/* Likes */}
              <div className="mission-category">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Likes</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[10, 20, 50, 100].map(count => (
                    <button 
                      key={count}
                      onClick={() => selectMission('likes', count)}
                      className={`mission-button px-4 py-3 rounded-lg font-medium text-sm ${missions.likes.selected && missions.likes.count === count ? 'completed' : ''}`}
                    >
                      {count} Likes
                    </button>
                  ))}
                </div>
                {missions.likes.selected && (
                  <div className="progress-bar h-2 mb-3">
                    <div className="progress-fill" style={{width: `${getProgressPercentage('likes')}%`}}></div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {renderMissionButtons('likes')}
                </div>
              </div>

              {/* Comments */}
              <div className="mission-category">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zM14.625 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Comments</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[10, 20, 50, 100].map(count => (
                    <button 
                      key={count}
                      onClick={() => selectMission('comments', count)}
                      className={`mission-button px-4 py-3 rounded-lg font-medium text-sm ${missions.comments.selected && missions.comments.count === count ? 'completed' : ''}`}
                    >
                      {count} Comments
                    </button>
                  ))}
                </div>
                {missions.comments.selected && (
                  <div className="progress-bar h-2 mb-3">
                    <div className="progress-fill" style={{width: `${getProgressPercentage('comments')}%`}}></div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {renderMissionButtons('comments')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Follow Account Section */}
        {showFollowSection && (
          <div className="glass-card rounded-3xl p-8 mb-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10"></div>
            <div className="relative z-10">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 9v3.766l-2 1.334V9a3 3 0 00-6 0v4.1l-2-1.334V9a5 5 0 0110 0z"/>
                    <path fillRule="evenodd" d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zM4.5 12a7.5 7.5 0 1115 0 7.5 7.5 0 01-15 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">Follow Required Account</h2>
                <p className="text-gray-300 mb-6 max-w-md mx-auto">Complete this step to unlock your mission rewards and boost your growth</p>
                
                <div className="bg-white/5 rounded-2xl p-6 mb-6 max-w-md mx-auto">
                  <div className="text-lg font-medium text-cyan-400 mb-4 break-all">
                    {selectedPlatform && platformLinks[selectedPlatform as keyof typeof platformLinks]}
                  </div>
                  <button 
                    onClick={followAccount}
                    disabled={alreadyFollowed}
                    className={`w-full px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl mb-4 transition-all ${
                      followCompleted 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                        : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500'
                    } ${alreadyFollowed ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <span className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        {followCompleted ? (
                          <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd"/>
                        ) : (
                          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.5 6L12 10.5 8.5 8 12 5.5 15.5 8zM8.5 16L12 13.5 15.5 16 12 18.5 8.5 16z"/>
                        )}
                      </svg>
                      {followCompleted ? (alreadyFollowed ? 'Confirmed!' : 'Followed!') : 'Follow Account'}
                    </span>
                  </button>
                  
                  <div className="border-t border-white/10 pt-4">
                    <label className="flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={alreadyFollowed}
                        onChange={(e) => handleAlreadyFollowed(e.target.checked)}
                        className="w-5 h-5 text-cyan-500 bg-transparent border-2 border-white/30 rounded focus:ring-cyan-500 focus:ring-2 mr-3"
                      />
                      <span className="text-gray-300 text-sm">I have already followed this account</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Send Button */}
        {showSendSection && (
          <div className="text-center">
            <div className="max-w-md mx-auto">
              <div className="mb-6">
                <div className="text-2xl font-bold text-white mb-2">🎉 All Set!</div>
                <p className="text-gray-300">Your missions are complete and ready to process</p>
              </div>
              <button 
                onClick={sendMissions}
                className="liquid-send-button w-full px-12 py-6 rounded-2xl font-bold text-2xl text-black relative"
              >
                <span className="relative z-10">SEND MISSIONS</span>
              </button>
            </div>
          </div>
        )}

        {/* Warning Modal */}
        {warningModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card rounded-3xl p-8 max-w-md w-full mx-auto relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20"></div>
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">⚠️ IMPORTANT WARNING</h2>
                <p className="text-lg text-gray-200 mb-6 leading-relaxed">
                  Make sure You Follow The Account, If Not <span className="text-red-400 font-bold">YOU WILL NOT GET ANY</span> 
                  <span className="text-cyan-400 font-bold"> ({getSelectedServices().join(', ')})</span>
                </p>
                <button 
                  onClick={() => setWarningModal(false)}
                  className="w-full bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-400 hover:to-orange-500 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl"
                >
                  I UNDERSTAND
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Modal */}
        {duplicateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card rounded-3xl p-8 max-w-md w-full mx-auto relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20"></div>
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Already Used</h2>
                <p className="text-lg text-gray-200 mb-4 leading-relaxed">
                  You Have Used This Count Of <span className="text-cyan-400 font-bold">{duplicateMissionType.charAt(0).toUpperCase() + duplicateMissionType.slice(1)}</span>
                  <br />
                  <span className="text-gray-300 text-base">Please choose a different amount or wait for reset</span>
                </p>
                <div className="bg-white/10 rounded-xl p-4 mb-6 border border-cyan-500/20">
                  <div className="flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-cyan-400 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-cyan-400 font-semibold text-lg">Reset Timer</span>
                  </div>
                  <div className={`text-3xl font-bold text-center font-mono tracking-wider mb-2 ${resetCountdown === '00:00:00' ? 'text-green-400' : 'text-white'}`}>
                    {resetCountdown}
                  </div>
                  <div className="text-sm text-gray-400 text-center">
                    Time until you can use this amount again
                  </div>
                  <div className="mt-3 bg-cyan-500/10 rounded-lg p-2">
                    <div className="text-xs text-cyan-300 text-center">
                      It will Reset About 2 hours
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setDuplicateModal(false)}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl"
                >
                  CHOOSE DIFFERENT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {successModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card rounded-3xl p-8 max-w-md w-full mx-auto relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20"></div>
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">🎉 Mission Sent Successfully!</h2>
                <p className="text-lg text-gray-200 mb-6 leading-relaxed">
                  Your order has been submitted and is now being processed.
                  <br />
                  <span className="text-green-400 font-semibold">You will get your order soon!</span>
                </p>
                <div className="bg-green-500/10 rounded-xl p-4 mb-6 border border-green-500/20">
                  <div className="flex items-center justify-center mb-2">
                    <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-green-400 font-semibold">Processing Time</span>
                  </div>
                  <div className="text-sm text-green-300 text-center">
                    ⚡ Your growth will start Soon
                  </div>
                </div>
                <button 
                  onClick={() => setSuccessModal(false)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl"
                >
                  AWESOME!
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;