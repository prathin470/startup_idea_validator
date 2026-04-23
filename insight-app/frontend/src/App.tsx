import { useState, useRef, useEffect } from 'react';
import ChatInterface from './components/ui/ChatInterface';
import LoadingScreen from './components/ui/LoadingScreen';
import CompetitorAnalysis from './components/ui/CompetitorAnalysis';
import PersonaAnalysis, { type PersonaData } from './components/ui/PersonaAnalysis';
import { useErrorBoundary } from './hooks';
import { analyse, type AnalyseResult, type ChatMessage } from './services/api';

type Phase = 'chat' | 'loading' | 'competitors' | 'personas';

/* ── Mock persona data ──────────────────────────────────────────────────
   Replace with real backend response when Reddit scraping is ready. */
const mockPersonaData: PersonaData = {
  personas: [
    {
      id: 'maya',
      name: 'Maya Chen',
      age: 28,
      role: 'Product Manager',
      context: 'Works at a 20-person SaaS startup, managing a cross-functional team across 3 time zones.',
      redditSource: 'r/productmanagement',
      commentary: '"I spend 40 mins every morning just getting context on what happened overnight. By the time I\'m caught up, half my morning is gone."',
      thoughts: 'Current tools are built for big enterprise teams, not lean startups. I need something that gives me signal, not noise.',
      feelings: [
        { emoji: '😤', label: 'Overwhelmed' },
        { emoji: '⏱️', label: 'Time-poor' },
        { emoji: '🔍', label: 'Searching' },
      ],
      ideaScore: 8.9,
      journeySteps: [
        { title: 'Morning sync', description: 'Opens Slack, Jira, Notion, and email to piece together overnight updates', painPoint: 'No single source of truth — context is scattered' },
        { title: 'Task triage', description: 'Manually re-prioritises the backlog based on new info from 4 different sources', painPoint: 'Takes 30+ minutes, often misses things' },
        { title: 'Team standup', description: 'Runs a 15-min standup but half the team is async so it\'s never complete', painPoint: 'Async members are always out of the loop' },
        { title: 'Status reporting', description: 'Manually compiles progress into a weekly stakeholder update', painPoint: 'Repetitive manual work that adds no value' },
        { title: 'Sprint close', description: 'Reviews completed tasks against goals, writes retro notes', painPoint: 'No automated way to measure goal achievement' },
      ],
    },
    {
      id: 'james',
      name: 'James Okafor',
      age: 44,
      role: 'SMB Founder',
      context: 'Runs a 12-person digital agency. Wears many hats across sales, operations, and client delivery.',
      redditSource: 'r/entrepreneur',
      commentary: '"Every tool I try costs a fortune once you add per-seat pricing. I\'m paying for features my team will never use."',
      thoughts: 'I just need the basics done well. I don\'t need 200 features — I need my team to actually use the tool.',
      feelings: [
        { emoji: '💸', label: 'Cost-conscious' },
        { emoji: '😩', label: 'Feature-fatigued' },
        { emoji: '🎯', label: 'Results-focused' },
      ],
      ideaScore: 9.2,
      journeySteps: [
        { title: 'Client kickoff', description: 'Sets up a new project in Monday.com, copies template, adjusts manually', painPoint: 'Setup takes 2 hours per new client' },
        { title: 'Team briefing', description: 'Sends a Slack message + email + adds Jira tickets to cover all bases', painPoint: 'Triple communication because nobody reads everything' },
        { title: 'Progress check', description: 'Manually pings each team member mid-week for status updates', painPoint: 'Feels like micromanaging, kills morale' },
        { title: 'Client update', description: 'Assembles progress report from multiple sources for weekly client call', painPoint: '2 hours of prep for a 20-minute call' },
        { title: 'Invoice & close', description: 'Cross-references deliverables against scope to prep final invoice', painPoint: 'Scope creep is invisible until it\'s too late' },
      ],
    },
    {
      id: 'priya',
      name: 'Priya Sharma',
      age: 34,
      role: 'Remote Team Lead',
      context: 'Engineering lead at a fully distributed company spanning 5 countries and 4 time zones.',
      redditSource: 'r/remotework',
      commentary: '"Someone asks a question and by the time anyone sees it, the context is lost and we\'re firefighting again."',
      thoughts: 'Remote work tools were built for performance tracking, not actual human coordination. There\'s a huge gap.',
      feelings: [
        { emoji: '🌍', label: 'Distributed' },
        { emoji: '🔗', label: 'Disconnected' },
        { emoji: '💡', label: 'Hopeful' },
      ],
      ideaScore: 9.5,
      journeySteps: [
        { title: 'Async check-in', description: 'Team posts updates in a Slack channel that no one reliably reads', painPoint: 'Updates get buried, no one has the full picture' },
        { title: 'Timezone sync', description: 'Manually identifies overlapping hours for critical decisions', painPoint: '30+ minutes to find a slot that works for 5+ people' },
        { title: 'Code review', description: 'PRs sit for days because reviewers are in other time zones', painPoint: 'Blocked work costs 2–3 days per cycle' },
        { title: 'Incident response', description: 'Scrambles to find the right person when something breaks at odd hours', painPoint: 'No clear on-call system, always ad-hoc' },
        { title: 'Team health check', description: 'Manually runs pulse surveys to gauge morale and blockers', painPoint: 'Low response rate means constant blind spots' },
      ],
    },
    {
      id: 'tom',
      name: 'Tom Bradley',
      age: 52,
      role: 'Operations Manager',
      context: 'Mid-size manufacturing firm, recently pushed to adopt digital tools by leadership.',
      redditSource: 'r/smallbusiness',
      commentary: '"Every time we get a new system, I spend 3 months getting people to use it. Then leadership changes and we switch again."',
      thoughts: 'I\'ve seen too many tools promise transformation and deliver headaches. Show me something that works in the first week.',
      feelings: [
        { emoji: '😒', label: 'Skeptical' },
        { emoji: '📋', label: 'Process-driven' },
        { emoji: '🏭', label: 'Old-school' },
      ],
      ideaScore: 6.1,
      journeySteps: [
        { title: 'Morning briefing', description: 'Walks the floor, checks whiteboards, talks to supervisors in person', painPoint: 'Time-consuming but the only info source he trusts' },
        { title: 'Email triage', description: 'Processes 80+ emails daily, most are status updates', painPoint: 'Critical info buried in long email threads' },
        { title: 'Shift handover', description: 'Runs a 30-min handover meeting between shifts', painPoint: 'Inconsistent docs mean context is always lost' },
        { title: 'KPI reporting', description: 'Manually compiles data from 3 systems into an Excel report', painPoint: 'Takes half a day every Friday' },
        { title: 'Issue escalation', description: 'Handles escalations verbally — rarely documented', painPoint: 'No audit trail, same problems recur' },
      ],
    },
    {
      id: 'zoe',
      name: 'Zoe Kim',
      age: 23,
      role: 'Freelance Designer',
      context: 'Solo freelancer managing 4–6 client projects simultaneously from home.',
      redditSource: 'r/freelance',
      commentary: '"I tried Asana, ClickUp, Notion — they\'re all built for teams. I just need something for one person with multiple clients."',
      thoughts: 'Every tool assumes you\'re a team. I\'m one person with multiple clients and need a completely different mental model.',
      feelings: [
        { emoji: '🎨', label: 'Creative' },
        { emoji: '😫', label: 'Juggling' },
        { emoji: '💰', label: 'Budget-tight' },
      ],
      ideaScore: 7.4,
      journeySteps: [
        { title: 'Client intake', description: 'Gets brief via email, manually creates a Notion page and Trello card', painPoint: 'Double entry on every single new client' },
        { title: 'Project scoping', description: 'Writes scope in Google Docs, sends via email', painPoint: 'Clients reply with changes in email chains' },
        { title: 'Active work', description: 'Switches between Figma, Slack, and email constantly throughout the day', painPoint: 'Context switching destroys deep work sessions' },
        { title: 'Feedback round', description: 'Shares Figma link, collects feedback across email + comments', painPoint: 'Feedback is scattered, revisions get missed' },
        { title: 'Invoice & payment', description: 'Creates invoice in a separate tool, chases late payments manually', painPoint: 'Cash flow unpredictable, payment chasing is awkward' },
      ],
    },
    {
      id: 'alex',
      name: 'Alex Rivera',
      age: 31,
      role: 'Growth Lead',
      context: 'Early-stage startup, team of 8. Responsible for marketing, partnerships, and revenue ops.',
      redditSource: 'r/startups',
      commentary: '"I\'m running 6 growth experiments at once and have no single place to track what\'s working. I find out things failed two weeks after the fact."',
      thoughts: 'Growth work is inherently cross-functional but every tool I use is siloed. Nothing connects experiments to outcomes to team actions.',
      feelings: [
        { emoji: '🚀', label: 'Ambitious' },
        { emoji: '📊', label: 'Data-hungry' },
        { emoji: '😵', label: 'Overwhelmed' },
      ],
      ideaScore: 8.6,
      journeySteps: [
        { title: 'Experiment planning', description: 'Defines hypothesis in Notion, sets up tracking in a separate spreadsheet', painPoint: 'No link between the plan and the data — always manual' },
        { title: 'Campaign launch', description: 'Coordinates across design, eng, and content via Slack threads', painPoint: 'Threads get lost, launch dependencies missed' },
        { title: 'Performance check', description: 'Pulls data from GA4, Mixpanel, and HubSpot into a weekly dashboard', painPoint: '3 hours every Monday just to compile numbers' },
        { title: 'Team sync', description: 'Weekly growth meeting where half the time is spent getting everyone context', painPoint: 'Context-setting eats the time meant for decisions' },
        { title: 'Retrospective', description: 'Documents learnings in Notion after campaigns close', painPoint: 'Nobody reads retros — same mistakes repeat next quarter' },
      ],
    },
  ],
  /* Exclusivity score between each pair of personas (0–100).
     Higher = more distinct segments. Diagonal is always 0 (self-comparison). */
  exclusivityMatrix: [
    //  Maya  James  Priya  Tom   Zoe   Alex
    [0,    70,    35,    80,   85,   55], // Maya
    [70,   0,     60,    45,   75,   65], // James
    [35,   60,    0,     65,   55,   50], // Priya
    [80,   45,    65,    0,    90,   78], // Tom
    [85,   75,    55,    90,   0,    70], // Zoe
    [55,   65,    50,    78,   70,   0 ], // Alex
  ],
};


export default function App() {
  const [phase, setPhase] = useState<Phase>('chat');
  const [competitorData, setCompetitorData] = useState<AnalyseResult | null>(null);
  const [analyseError, setAnalyseError] = useState<string | null>(null);
  const ideaRef = useRef<string>('');

  /* Scroll to top on every phase transition so new screens always start at
     the top, not at the scroll position left by the previous screen's button. */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [phase]);

  const analysePromise = useRef<Promise<AnalyseResult | null> | null>(null);

  const withBoundary = useErrorBoundary(
    <div className="flex items-center justify-center h-screen bg-stone-50">
      <p className="text-zinc-400 text-sm">Something went wrong. Please refresh the page.</p>
    </div>
  );

  function handleChatSubmit(idea: string, conversation: ChatMessage[]) {
    ideaRef.current = idea;
    setAnalyseError(null);
    analysePromise.current = analyse(idea, conversation).catch((err) => {
      const msg = err?.response?.data?.detail ?? err?.message ?? 'Unknown error';
      setAnalyseError(msg);
      return null;
    });
    setPhase('loading');
  }

  async function handleLoadingComplete() {
    const analyseResult = await analysePromise.current;
    if (analyseResult) {
      setCompetitorData(analyseResult);
      setPhase('competitors');
    } else {
      /* API failed — stay on an error screen instead of showing stale mock data */
      setPhase('chat');
    }
  }

  return withBoundary(
    <div className="min-h-screen bg-gradient-to-br from-amber-50/60 via-stone-50 to-white">
      {phase === 'chat' && (
        <>
          <ChatInterface onSubmit={handleChatSubmit} />
          {analyseError && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-600 text-sm px-5 py-3 rounded-xl shadow-sm max-w-lg text-center">
              Analysis failed: {analyseError}. Check the backend is running and try again.
            </div>
          )}
        </>
      )}
      {phase === 'loading'     && <LoadingScreen onComplete={handleLoadingComplete} />}
      {phase === 'competitors' && competitorData && <CompetitorAnalysis data={competitorData} onNext={() => setPhase('personas')} />}
      {phase === 'personas'    && <PersonaAnalysis data={mockPersonaData} onBack={() => setPhase('competitors')} />}
    </div>
  );
}
