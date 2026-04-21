import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileText, Globe, Info, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet-async';
const WIKIGRAPH_LOGO = '/pwa-192x192.png';

const AboutPage = () => {
  return (
    <>
      <Helmet>
        <title>About WikiGraph | Wikipedia Map Project</title>
        <meta name="description" content="Learn how WikiGraph maps Wikipedia knowledge to real-world places and discover the project background, sources, and app capabilities." />
        <link rel="canonical" href="https://wikigraph.app/about" />
        <meta property="og:title" content="About WikiGraph | Wikipedia Map Project" />
        <meta property="og:description" content="Learn how WikiGraph maps Wikipedia knowledge to real-world places and discover the project background, sources, and app capabilities." />
        <meta property="og:url" content="https://wikigraph.app/about" />
        <meta name="twitter:title" content="About WikiGraph | Wikipedia Map Project" />
        <meta name="twitter:description" content="Learn more about WikiGraph, its mission, and the Wikipedia-powered data sources." />
      </Helmet>
      <div className="min-h-[100dvh] bg-background flex flex-col">
        {/* Header */}
        <header className="p-4 pt-[max(1rem,env(safe-area-inset-top,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] border-b border-border">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Map</span>
          </Link>
        </header>

      <main className="flex-1 flex flex-col items-center p-6 max-w-2xl mx-auto w-full pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        {/* Hero */}
        <img src={WIKIGRAPH_LOGO} alt="WikiGraph" className="w-20 h-20 mb-6 mt-4" />
        <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
          About Wiki<span className="text-primary">Graph</span>
        </h1>
        <p className="text-muted-foreground text-center mb-10 max-w-md">
          Discover knowledge everywhere. An interactive map that surfaces Wikipedia
          articles tied to real-world places around you.
        </p>

        {/* About app */}
        <section className="w-full mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            About the App
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>
              WikiGraph turns the world map into a portal into Wikipedia. Pan and
              zoom anywhere on Earth to discover articles, monuments, museums, and
              landmarks tied to that location.
            </p>
            <p>
              Search by name or coordinates, switch reading languages, and use
              themed discovery to surface random places from categories you love.
              The app works as an installable PWA with offline support for
              previously viewed articles and tiles.
            </p>
          </div>
        </section>

        {/* Wikipedia */}
        <section className="w-full mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Powered by Wikipedia
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>
              All article content, summaries, and images are provided by the{' '}
              <a
                href="https://www.wikipedia.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Wikipedia community <ExternalLink className="w-3 h-3" />
              </a>{' '}
              and licensed under{' '}
              <a
                href="https://creativecommons.org/licenses/by-sa/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                CC BY-SA 4.0 <ExternalLink className="w-3 h-3" />
              </a>
              .
            </p>
            <p>
              WikiGraph is an independent project and is not affiliated with the
              Wikimedia Foundation.
            </p>
            <a
              href="https://en.wikipedia.org/api/rest_v1/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
            >
              Wikipedia REST API <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </section>

        {/* Install */}
        <section className="w-full mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Install
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>
              WikiGraph is a Progressive Web App. Install it to your device for a
              native app experience with offline support.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link to="/install">
                <Button size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Install App
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <p className="text-xs text-muted-foreground mt-4 mb-8">
          © {new Date().getFullYear()} WikiGraph
        </p>
        </main>
      </div>
    </>
  );
};

export default AboutPage;
