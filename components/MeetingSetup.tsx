'use client';
import { useEffect, useState } from 'react';
import {
  DeviceSettings,
  VideoPreview,
  useCall,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import { motion } from 'framer-motion';
import Alert from './Alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Mic, MicOff, Video, VideoOff, Users, Settings, Volume2, Monitor } from 'lucide-react';

const MeetingSetup = ({
  setIsSetupComplete,
}: {
  setIsSetupComplete: (value: boolean) => void;
}) => {
  const { useCallEndedAt, useCallStartsAt } = useCallStateHooks();
  const callStartsAt = useCallStartsAt();
  const callEndedAt = useCallEndedAt();
  const callTimeNotArrived = callStartsAt && new Date(callStartsAt) > new Date();
  const callHasEnded = !!callEndedAt;
  const [participantName, setParticipantName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [showMicIndicator, setShowMicIndicator] = useState(false);
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [availableSpeakers, setAvailableSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');

  const call = useCall();

  if (!call) {
    throw new Error(
      'useStreamCall must be used within a StreamCall component.',
    );
  }

  // Initialize devices
  useEffect(() => {
    const initializeDevices = async () => {
      try {
        // Start with devices enabled by default
        await call.camera.enable();
        await call.microphone.enable();
        setIsCameraEnabled(true);
        setIsMicEnabled(true);
      } catch (err) {
        console.error('Error initializing devices:', err);
        // If devices fail to enable, update state accordingly
        try {
          await call.camera.disable();
          setIsCameraEnabled(false);
        } catch (cameraErr) {
          console.error('Error disabling camera:', cameraErr);
        }
        try {
          await call.microphone.disable();
          setIsMicEnabled(false);
        } catch (micErr) {
          console.error('Error disabling microphone:', micErr);
        }
        setError('Failed to initialize devices. Please check permissions.');
      }
    };

    initializeDevices();
  }, [call]); // Run when call changes

  // Get available devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        // Get microphones
        const mics = devices.filter(device => device.kind === 'audioinput');
        setAvailableMics(mics);
        if (mics.length > 0 && !selectedMic) {
          setSelectedMic(mics[0].deviceId);
        }
        
        // Get cameras
        const cameras = devices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(cameras);
        if (cameras.length > 0 && !selectedCamera) {
          setSelectedCamera(cameras[0].deviceId);
        }
        
        // Get speakers (audio output devices)
        const speakers = devices.filter(device => device.kind === 'audiooutput');
        setAvailableSpeakers(speakers);
        if (speakers.length > 0 && !selectedSpeaker) {
          setSelectedSpeaker(speakers[0].deviceId);
        }
      } catch (err) {
        console.error('Error getting devices:', err);
      }
    };

    getDevices();
  }, [selectedMic, selectedCamera, selectedSpeaker]);

  // Handle camera toggle
  const toggleCamera = async () => {
    try {
      if (isCameraEnabled) {
        // Disable camera through Stream SDK
        await call.camera.disable();
        
        // Wait a bit then try to stop any remaining tracks
        setTimeout(() => {
          try {
            // Try to stop any remaining video tracks
            navigator.mediaDevices.getUserMedia({ video: true })
              .then(stream => {
                stream.getTracks().forEach(track => {
                  if (track.kind === 'video') {
                    track.stop();
                  }
                });
              })
              .catch(() => {
                // No active streams to stop
              });
          } catch (err) {
            // Ignore errors
          }
        }, 100);
        
        setIsCameraEnabled(false);
      } else {
        await call.camera.enable();
        setIsCameraEnabled(true);
      }
    } catch (err) {
      console.error('Error toggling camera:', err);
      // Don't show error for permission issues, just update state
      if (err instanceof Error && err.message.includes('permission')) {
        setIsCameraEnabled(false);
      } else {
        setError('Failed to toggle camera. Please check permissions.');
      }
    }
  };

  // Handle microphone toggle
  const toggleMicrophone = async () => {
    try {
      if (isMicEnabled) {
        await call.microphone.disable();
        setIsMicEnabled(false);
      } else {
        await call.microphone.enable();
        setIsMicEnabled(true);
      }
    } catch (err) {
      console.error('Error toggling microphone:', err);
      setError('Failed to toggle microphone. Please check permissions.');
    }
  };

  // Handle join muted toggle
  const handleJoinMutedToggle = async (checked: boolean) => {
    try {
      if (checked) {
        // Only disable microphone when joining muted
        await call.microphone.disable();
        setIsMicEnabled(false);
      } else {
        // Only enable microphone when unchecking muted
        await call.microphone.enable();
        setIsMicEnabled(true);
      }
    } catch (err) {
      console.error('Error toggling microphone:', err);
      setError('Failed to toggle microphone. Please check permissions.');
    }
  };

  // Handle join camera toggle
  const handleJoinCameraToggle = async (checked: boolean) => {
    try {
      if (checked) {
        // Only disable camera when joining with camera off
        await call.camera.disable();
        setIsCameraEnabled(false);
      } else {
        // Only enable camera when unchecking camera off
        await call.camera.enable();
        setIsCameraEnabled(true);
      }
    } catch (err) {
      console.error('Error toggling camera:', err);
      setError('Failed to toggle camera. Please check permissions.');
    }
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      try {
        // Properly cleanup devices when component unmounts
        call.camera.disable();
        call.microphone.disable();
        
        // Force stop any remaining media tracks to turn off camera light
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(stream => {
            stream.getTracks().forEach(track => {
              track.stop();
            });
          })
          .catch(() => {
            // Ignore errors during cleanup
          });
      } catch (err) {
        console.error('Error cleaning up devices:', err);
      }
    };
  }, [call]);

  if (error) {
    return <Alert title={error} />;
  }

  if (callTimeNotArrived)
    return (
      <Alert
        title={`Your Meeting has not started yet. It is scheduled for ${callStartsAt.toLocaleString()}`}
      />
    );

  if (callHasEnded)
    return (
      <Alert
        title="The call has been ended by the host"
        iconUrl="/icons/call-ended.svg"
      />
    );

  const handleJoinMeeting = async () => {
    try {
      if (participantName) {
                 // Set the participant name and device states in the call metadata
         await call.join({
           data: { 
             custom: {
               participantName: participantName,
               initialCameraEnabled: isCameraEnabled,
               initialMicEnabled: isMicEnabled
             }
           }
         });

        // Set the initial device states
        if (!isCameraEnabled) {
          await call.camera.disable();
        }
        if (!isMicEnabled) {
          await call.microphone.disable();
        }

        setIsSetupComplete(true);
      }
    } catch (err) {
      console.error('Error joining meeting:', err);
      setError('Failed to join the meeting. Please try again.');
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-8">
             {/* Background Effects */}
       <div className="absolute inset-0 overflow-hidden">
         <div className="absolute -top-1/2 right-0 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[120px]" />
         <div className="absolute -bottom-1/2 left-0 h-[500px] w-[500px] rounded-full bg-purple-500/20 blur-[120px]" />
         <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-3xl" />
       </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative mx-auto max-w-5xl"
      >
                 <Card className="overflow-hidden bg-gray-900/50 backdrop-blur-xl border-0">
          <div className="p-6 md:p-8">
            <div className="mb-8 text-center">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
              >
                <h1 className="mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
                  Ready to Join?
                </h1>
                <p className="text-gray-400">
                  Set up your audio and video before joining the meeting
                </p>
              </motion.div>

              <div className="mx-auto mb-4 flex max-w-md items-center justify-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
                <Users className="h-4 w-4" />
                <span>Meeting ID: {call.id}</span>
              </div>
            </div>

                         <div className="grid gap-16 lg:grid-cols-2">
               {/* Left Column - Video Preview */}
               <div className="flex flex-col gap-12">
                                 <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: 0.4 }}
                   className="relative rounded-2xl bg-black/30 w-full max-w-4xl mx-auto"
                 >
                   <div className="border-none outline-none">
                     <VideoPreview className="aspect-video w-full object-cover" />
                   </div>
                  
                  {/* Camera Status Indicator */}
                  <div className="absolute left-4 top-4 flex items-center gap-2 rounded-lg bg-gray-900/90 px-3 py-1.5 text-sm backdrop-blur-sm">
                    <div className={`h-2 w-2 rounded-full ${isCameraEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-white">Camera {isCameraEnabled ? 'On' : 'Off'}</span>
                  </div>

                  {/* Quick Controls */}
                  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-gray-900/90 p-3 backdrop-blur-sm">
                    <button
                      onClick={toggleMicrophone}
                      className={`flex items-center gap-2 rounded-lg p-3 transition-colors ${
                        isMicEnabled
                          ? 'bg-gray-700/50 text-white hover:bg-gray-700'
                          : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                      }`}
                      title={isMicEnabled ? 'Turn off microphone' : 'Turn on microphone'}
                    >
                      {isMicEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={toggleCamera}
                      className={`flex items-center gap-2 rounded-lg p-3 transition-colors ${
                        isCameraEnabled
                          ? 'bg-gray-700/50 text-white hover:bg-gray-700'
                          : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                      }`}
                      title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
                    >
                      {isCameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                    </button>
                     <button
                       onClick={() => setShowSettings(!showSettings)}
                       className="flex items-center gap-2 rounded-lg bg-gray-700/50 p-3 text-white transition-colors hover:bg-gray-700"
                       title="Device settings"
                     >
                       <Settings className="h-5 w-5" />
                     </button>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-3"
                >
                  <Label htmlFor="name" className="text-sm font-medium text-gray-300">
                    Display Name
                  </Label>
                  <div className="relative">
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your name"
                      value={participantName}
                      onChange={(e) => setParticipantName(e.target.value)}
                      className="border-gray-700/50 bg-gray-800/50 pl-10 text-white placeholder:text-gray-500"
                    />
                    <Users className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-400">This is how other participants will see you</p>
                </motion.div>
              </div>

              {/* Right Column - Controls */}
              <div className="flex flex-col justify-between gap-6">
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-6"
                >
                   {showSettings && (
                     <div className="rounded-xl border border-gray-700/50 bg-gray-800/30 p-6 backdrop-blur-sm">
                       <div className="mb-6 flex items-center gap-3">
                         <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                           <Settings className="h-5 w-5 text-blue-400" />
                         </div>
                         <div>
                           <h3 className="text-xl font-semibold text-white">Device Settings</h3>
                           <p className="text-sm text-gray-300">Configure your audio and video devices</p>
                         </div>
                       </div>
                       <div className="rounded-lg bg-gray-900/50 p-4 border border-gray-700/30">
                         <DeviceSettings />
                       </div>
                     </div>
                   )}

                  <div className="space-y-4 rounded-xl border border-gray-700/50 bg-gray-800/30 p-4">
                    <div className="flex items-center gap-3">
                      <Monitor className="h-5 w-5 text-gray-400" />
                      <div>
                        <h3 className="font-medium text-white">System Check</h3>
                        <p className="text-sm text-gray-400">Verify your setup is working</p>
                      </div>
                    </div>

                                         <div className="space-y-3">
                       <div className="flex items-center justify-between rounded-lg bg-gray-900/50 px-4 py-3">
                         <div className="flex items-center gap-3">
                           <Video className="h-5 w-5 text-gray-400" />
                           <span className="text-sm text-gray-300">Camera</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className={`text-sm ${isCameraEnabled ? 'text-green-400' : 'text-red-400'}`}>
                             {isCameraEnabled ? 'Working' : 'Disabled'}
                           </span>
                           {isCameraEnabled && (
                             <button
                               onClick={() => {
                                 // This would trigger a camera test in a real implementation
                                 console.log('Testing camera...');
                               }}
                               className="text-xs text-blue-400 hover:text-blue-300"
                             >
                               Test
                             </button>
                           )}
                         </div>
                       </div>

                                                                                               <div className="flex flex-col gap-2 rounded-lg bg-gray-900/50 px-4 py-3">
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                               <Mic className="h-5 w-5 text-gray-400" />
                               <span className="text-sm text-gray-300">Microphone</span>
                             </div>
                             <div className="flex items-center gap-2">
                               <span className={`text-sm ${isMicEnabled ? 'text-green-400' : 'text-red-400'}`}>
                                 {isMicEnabled ? 'Working' : 'Disabled'}
                               </span>
                                                          {isMicEnabled && (
                                <button
                                                                   onClick={async () => {
                                   try {
                                     // Show the indicator line
                                     setShowMicIndicator(true);
                                     
                                     // Get microphone stream for testing
                                     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                     
                                     // Create audio context for level monitoring
                                     const audioContext = new AudioContext();
                                     const source = audioContext.createMediaStreamSource(stream);
                                     const analyser = audioContext.createAnalyser();
                                     source.connect(analyser);
                                     
                                     // Create a MediaRecorder to record audio
                                     const mediaRecorder = new MediaRecorder(stream);
                                     const audioChunks: Blob[] = [];
                                     
                                     mediaRecorder.ondataavailable = (event) => {
                                       audioChunks.push(event.data);
                                     };
                                     
                                     // Find the button element
                                     const testButton = document.querySelector('[data-test="mic-test"]') as HTMLButtonElement;
                                     if (testButton) {
                                       const originalText = testButton.textContent;
                                       testButton.textContent = 'Recording...';
                                       testButton.disabled = true;
                                       
                                       // Monitor audio levels using the visual indicator
                                       const levelIndicator = document.getElementById('mic-level-indicator');
                                       const dataArray = new Uint8Array(analyser.frequencyBinCount);
                                       const levelInterval = setInterval(() => {
                                         analyser.getByteFrequencyData(dataArray);
                                         const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                                         const level = Math.min(100, (average / 128) * 100);
                                         if (levelIndicator) {
                                           levelIndicator.style.width = `${level}%`;
                                         }
                                       }, 50);
                                       
                                       mediaRecorder.onstop = async () => {
                                         clearInterval(levelInterval);
                                         if (levelIndicator) {
                                           levelIndicator.style.width = '0%';
                                         }
                                         
                                         // Create audio blob and play it back
                                         const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                                         const audioUrl = URL.createObjectURL(audioBlob);
                                         const audio = new Audio(audioUrl);
                                         
                                         testButton.textContent = 'Playing...';
                                         
                                         // Play the recorded audio
                                         await audio.play();
                                         
                                         // Reset button after playback and hide indicator
                                         setTimeout(() => {
                                           testButton.textContent = originalText;
                                           testButton.disabled = false;
                                           setShowMicIndicator(false);
                                           URL.revokeObjectURL(audioUrl);
                                           audioContext.close();
                                         }, 3000);
                                       };
                                     }
                                     
                                     // Start recording
                                     mediaRecorder.start();
                                     
                                     // Stop recording after 3 seconds
                                     setTimeout(() => {
                                       mediaRecorder.stop();
                                       stream.getTracks().forEach(track => track.stop());
                                     }, 3000);
                                     
                                   } catch (err) {
                                     console.error('Microphone test failed:', err);
                                     setShowMicIndicator(false);
                                     alert('Microphone test failed. Please check permissions and try again.');
                                   }
                                 }}
                                  className="text-xs text-blue-400 hover:text-blue-300 relative"
                                  data-test="mic-test"
                                >
                                  Test
                                </button>
                              )}
                             </div>
                           </div>
                           
                                                       {/* Audio Level Indicator Line - Only show when testing */}
                            {showMicIndicator && (
                              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  id="mic-level-indicator"
                                  className="h-full bg-blue-500 transition-all duration-100 rounded-full"
                                  style={{ width: '0%' }}
                                />
                              </div>
                            )}
                         </div>

                                               <div className="flex items-center justify-between rounded-lg bg-gray-900/50 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Volume2 className="h-5 w-5 text-gray-400" />
                            <span className="text-sm text-gray-300">Speaker</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-green-400">Working</span>
                                                         <button
                                                               onClick={() => {
                                  try {
                                                                         // Create speech synthesis for "test one two three"
                                     const utterance = new SpeechSynthesisUtterance("test one two three");
                                    utterance.rate = 0.7; // Slower for clarity
                                    utterance.pitch = 1.0; // Normal pitch
                                    utterance.volume = 0.8; // Good volume
                                    
                                    // Use a clear voice if available
                                    const voices = speechSynthesis.getVoices();
                                    const preferredVoice = voices.find(voice => 
                                      voice.lang.includes('en') && voice.name.includes('Google')
                                    ) || voices.find(voice => voice.lang.includes('en')) || voices[0];
                                    
                                    if (preferredVoice) {
                                      utterance.voice = preferredVoice;
                                    }
                                    
                                    // Update button text during test
                                    const testButton = document.querySelector('[data-test="speaker-test"]') as HTMLButtonElement;
                                    if (testButton) {
                                      const originalText = testButton.textContent;
                                      testButton.textContent = 'Playing...';
                                      testButton.disabled = true;
                                      
                                      utterance.onend = () => {
                                        testButton.textContent = originalText;
                                        testButton.disabled = false;
                                        console.log('Speaker test completed');
                                      };
                                    }
                                    
                                    // Speak the test phrase
                                    speechSynthesis.speak(utterance);
                                    
                                  } catch (err) {
                                    console.error('Speaker test failed:', err);
                                    alert('Speaker test failed. Please check your audio settings.');
                                  }
                                }}
                               className="text-xs text-blue-400 hover:text-blue-300"
                               data-test="speaker-test"
                             >
                               Test
                             </button>
                          </div>
                        </div>
                     </div>
                                     </div>

                                       {/* Join Preferences */}
                    <div className="space-y-4 rounded-xl border border-gray-700/50 bg-gray-800/30 p-4">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-gray-400" />
                        <div>
                          <h3 className="font-medium text-white">Join Preferences</h3>
                          <p className="text-sm text-gray-400">Choose how you want to join</p>
                        </div>
                      </div>

                     <div className="grid grid-cols-2 gap-2">
                                               <button
                          onClick={async () => {
                            try {
                              await call.camera.enable();
                              await call.microphone.enable();
                              setIsCameraEnabled(true);
                              setIsMicEnabled(true);
                            } catch (err) {
                              console.error('Error enabling all devices:', err);
                            }
                          }}
                          className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-400 transition-colors hover:bg-green-500/20"
                        >
                          <Video className="h-4 w-4" />
                          <span>All On</span>
                        </button>
                                                                                                   <button
                            onClick={async () => {
                              try {
                                await call.camera.disable();
                                await call.microphone.disable();
                                
                                // Wait a bit then try to stop any remaining tracks
                                setTimeout(() => {
                                  try {
                                    navigator.mediaDevices.getUserMedia({ video: true })
                                      .then(stream => {
                                        stream.getTracks().forEach(track => {
                                          if (track.kind === 'video') {
                                            track.stop();
                                          }
                                        });
                                      })
                                      .catch(() => {
                                        // No active streams to stop
                                      });
                                  } catch (err) {
                                    // Ignore errors
                                  }
                                }, 100);
                                
                                setIsCameraEnabled(false);
                                setIsMicEnabled(false);
                              } catch (err) {
                                console.error('Error disabling all devices:', err);
                              }
                            }}
                            className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/20"
                          >
                            <VideoOff className="h-4 w-4" />
                            <span>All Off</span>
                          </button>
                         <button
                           onClick={async () => {
                             try {
                               await call.camera.enable();
                               await call.microphone.disable();
                               setIsCameraEnabled(true);
                               setIsMicEnabled(false);
                             } catch (err) {
                               console.error('Error setting video only:', err);
                             }
                           }}
                           className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-400 transition-colors hover:bg-blue-500/20"
                         >
                           <Video className="h-4 w-4" />
                           <span>Video Only</span>
                         </button>
                                                   <button
                            onClick={async () => {
                              try {
                                await call.camera.disable();
                                await call.microphone.enable();
                                
                                // Wait a bit then try to stop any remaining tracks
                                setTimeout(() => {
                                  try {
                                    navigator.mediaDevices.getUserMedia({ video: true })
                                      .then(stream => {
                                        stream.getTracks().forEach(track => {
                                          if (track.kind === 'video') {
                                            track.stop();
                                          }
                                        });
                                      })
                                      .catch(() => {
                                        // No active streams to stop
                                      });
                                  } catch (err) {
                                    // Ignore errors
                                  }
                                }, 100);
                                
                                setIsCameraEnabled(false);
                                setIsMicEnabled(true);
                              } catch (err) {
                                console.error('Error setting audio only:', err);
                              }
                            }}
                            className="flex items-center gap-2 rounded-lg bg-purple-500/10 px-3 py-2 text-sm text-purple-400 transition-colors hover:bg-purple-500/20"
                          >
                            <Mic className="h-4 w-4" />
                            <span>Audio Only</span>
                          </button>
                     </div>
                                       </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="space-y-3"
                >
                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-6 text-lg font-medium text-white transition-all hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600"
                    onClick={handleJoinMeeting}
                    disabled={!participantName}
                  >
                    Join Meeting
                  </Button>
                  {!participantName && (
                    <p className="text-center text-sm text-gray-400">
                      Please enter your name to join the meeting
                    </p>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default MeetingSetup;
