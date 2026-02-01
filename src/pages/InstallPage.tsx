import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Check, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import wikiGraphLogo from '@/assets/WikiGraph.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check for iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-border">
        <Link to="/" className="inline-flex items-center gap-2 text-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Map</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <img 
          src={wikiGraphLogo} 
          alt="WikiGraph" 
          className="w-20 h-20 mb-6"
        />
        
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Install WikiGraph
        </h1>
        
        <p className="text-muted-foreground mb-8 max-w-md">
          Add WikiGraph to your home screen for quick access, offline support, and a native app experience.
        </p>

        {isInstalled ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <p className="text-lg font-medium text-foreground">Already Installed!</p>
            <p className="text-sm text-muted-foreground">
              WikiGraph is ready to use on your device.
            </p>
            <Link to="/">
              <Button className="mt-4">Open App</Button>
            </Link>
          </div>
        ) : deferredPrompt ? (
          <Button onClick={handleInstall} size="lg" className="gap-2">
            <Download className="w-5 h-5" />
            Install App
          </Button>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Smartphone className="w-5 h-5" />
              <span>Manual installation required</span>
            </div>

            {isIOS ? (
              <div className="bg-card border border-border rounded-lg p-6 text-left max-w-sm">
                <h3 className="font-semibold text-foreground mb-4">
                  Install on iOS
                </h3>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">1.</span>
                    Tap the Share button <span className="inline-block px-1 py-0.5 bg-muted rounded text-xs">⎋</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">2.</span>
                    Scroll down and tap "Add to Home Screen"
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">3.</span>
                    Tap "Add" in the top right
                  </li>
                </ol>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-6 text-left max-w-sm">
                <h3 className="font-semibold text-foreground mb-4">
                  Install on Android
                </h3>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">1.</span>
                    Tap the menu button <span className="inline-block px-1 py-0.5 bg-muted rounded text-xs">⋮</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">2.</span>
                    Tap "Install app" or "Add to Home Screen"
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">3.</span>
                    Tap "Install" to confirm
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Features */}
        <div className="mt-12 grid gap-4 max-w-md w-full">
          <div className="flex items-start gap-4 text-left">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Works Offline</h4>
              <p className="text-sm text-muted-foreground">
                Previously viewed articles and map tiles are cached for offline access.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 text-left">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Native Experience</h4>
              <p className="text-sm text-muted-foreground">
                Full-screen app experience without browser UI clutter.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InstallPage;
