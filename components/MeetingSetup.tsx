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
        if (isCameraEnabled) {
          await call.camera.enable();
        } else {
          await call.camera.disable();
        }

        if (isMicEnabled) {
          await call.microphone.enable();
        } else {
          await call.microphone.disable();
        }
      } catch (err) {
        console.error('Error initializing devices:', err);
        setError('Failed to initialize devices. Please check permissions.');
      }
    };

    initializeDevices();
  }, []); // Run only once on mount

  // Handle camera toggle
  const toggleCamera = async () => {
    try {
      if (isCameraEnabled) {
        await call.camera.disable();
        setIsCameraEnabled(false);
      } else {
        await call.camera.enable();
        setIsCameraEnabled(true);
      }
    } catch (err) {
      console.error('Error toggling camera:', err);
      setError('Failed to toggle camera. Please check permissions.');
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
        await Promise.all([
          call.camera.disable(),
          call.microphone.disable()
        ]);
        setIsCameraEnabled(false);
        setIsMicEnabled(false);
      } else {
        await Promise.all([
          call.camera.enable(),
          call.microphone.enable()
        ]);
        setIsCameraEnabled(true);
        setIsMicEnabled(true);
      }
    } catch (err) {
      console.error('Error toggling devices:', err);
      setError('Failed to toggle devices. Please check permissions.');
    }
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      try {
        call.camera.disable();
        call.microphone.disable();
      } catch (err) {
        console.error('Error cleaning up devices:', err);
      }
    };
  }, []);

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
          create: false,
          data: {
            custom: {
              name: participantName,
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
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative mx-auto max-w-5xl"
      >
        <Card className="overflow-hidden border-gray-800/50 bg-gray-900/50 backdrop-blur-xl">
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

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Left Column - Video Preview */}
              <div className="flex flex-col gap-6">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="relative overflow-hidden rounded-2xl border-2 border-gray-700/50 bg-black/30"
                >
                  <VideoPreview className="aspect-video w-full object-cover" />
                  
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
                    <div className="rounded-xl border border-gray-700/50 bg-gray-800/30 p-4">
                      <div className="mb-4 flex items-center gap-3">
                        <Settings className="h-5 w-5 text-gray-400" />
                        <div>
                          <h3 className="text-lg font-medium text-white">Device Settings</h3>
                          <p className="text-sm text-gray-400">Select your audio and video devices</p>
                        </div>
                      </div>
                      <DeviceSettings />
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
                        <span className={`text-sm ${isCameraEnabled ? 'text-green-400' : 'text-red-400'}`}>
                          {isCameraEnabled ? 'Working' : 'Disabled'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-gray-900/50 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Mic className="h-5 w-5 text-gray-400" />
                          <span className="text-sm text-gray-300">Microphone</span>
                        </div>
                        <span className={`text-sm ${isMicEnabled ? 'text-green-400' : 'text-red-400'}`}>
                          {isMicEnabled ? 'Working' : 'Disabled'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-gray-900/50 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-gray-400" />
                          <span className="text-sm text-gray-300">Speaker</span>
                        </div>
                        <span className="text-sm text-green-400">Working</span>
                      </div>
                    </div>
                  </div>

                  {/* Join Preferences */}
                  <div className="flex items-center gap-3 rounded-xl border border-gray-700/50 bg-gray-800/30 p-4">
                    <Users className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <h3 className="mb-1 font-medium text-white">Join Preferences</h3>
                      <p className="text-sm text-gray-400">Choose how you want to join</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="mute-toggle"
                        checked={!isMicEnabled && !isCameraEnabled}
                        onCheckedChange={handleJoinMutedToggle}
                      />
                      <Label
                        htmlFor="mute-toggle"
                        className="cursor-pointer text-sm text-gray-300"
                      >
                        Join muted
                      </Label>
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
