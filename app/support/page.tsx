import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MatrixTrack 2.0 — Support",
  description: "Help with MatrixTrack 2.0 accounts, location, photos, inspections, and technical support.",
};

const sections = [
  {
    id: "getting-started", title: "Getting started",
    items: [
      { question: "How do I get an account?", answer: "Accounts are created and assigned by your City Administrator. If you don't have login credentials, contact your City Administrator to have an account set up with the correct role, zone, and ward mapping." },
      { question: "I can't see my ward / assigned assets.", answer: "Zones and wards are mapped to your profile by the City Admin. If your ward isn't showing up, ask your administrator to confirm your profile is mapped to the correct zones and wards." },
      { question: "Why was I logged out automatically?", answer: "For security, sessions expire after 20 minutes of inactivity. Simply log back in to continue. Submit any in-progress inspection before your session ends, as unsaved work may be lost on logout." },
    ],
  },
  {
    id: "location", title: "Location & GPS",
    items: [
      { question: 'The app says I’m "Outside Area" and won’t let me start an inspection.', answer: "To prevent fraudulent submissions, you must be within 100 meters of an asset's registered location to begin an inspection.", bullets: ["Make sure you're physically at the site.", "If the asset's registered location looks wrong, report it to your administrator so it can be corrected."] },
      { question: "My location isn't being detected.", answer: "", steps: ["Make sure Location Services are turned on for MatrixTrack 2.0 in your phone's Settings.", 'Grant the app "While Using the App" location permission.', "Move to an open area away from tall buildings for better GPS reception."] },
    ],
  },
  {
    id: "camera", title: "Camera & photos",
    items: [
      { question: "The camera is slow or won't open.", answer: "Give the camera a moment to initialize, and avoid taking photos in rapid succession. Also check that your device has enough free storage." },
      { question: "How many photos can I attach?", answer: "You can attach multiple photos per inspection item. At least one clear photo is required so the QC/reviewing officer can verify field conditions. Photos are automatically compressed to save data." },
    ],
  },
  {
    id: "inspections", title: "Inspections & submissions",
    items: [{ question: "Can I edit an inspection after submitting it?", answer: "No. Once submitted, an inspection goes to the review/QC team. If a correction is needed, the reviewer can reject it with remarks, which allows you to re-inspect and resubmit." }],
  },
  {
    id: "voice", title: "Voice input",
    items: [{ question: "", answer: "MatrixTrack 2.0 supports voice-to-text for filling in inspection notes in the field. If speech input isn't working, check that microphone and speech recognition permissions are enabled for the app in your phone's Settings." }],
  },
  {
    id: "language", title: "Language",
    items: [{ question: "", answer: "MatrixTrack 2.0 is available in English and Hindi. You can change the language from within the app settings." }],
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
          <Link href="/unified-login" className="text-sm font-semibold text-blue-300 underline-offset-4 hover:underline">← Back to sign in</Link>
          <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">MatrixTrack 2.0 — Support</h1>
          <p className="mt-5 max-w-3xl leading-7 text-slate-300">MatrixTrack 2.0 is a municipal sanitation operations app used by field employees, supervisors, quality controllers, and administrators of your municipal corporation. It is a private, role-based app — accounts are issued by your City Administrator, and there is no public sign-up.</p>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <nav aria-label="Support topics" className="mb-10 flex flex-wrap gap-2">
          {[...sections, { id: "contact", title: "Contact support" }].map(section => (
            <a key={section.id} href={`#${section.id}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-50">{section.title}</a>
          ))}
        </nav>
        <div className="space-y-6">
          {sections.map(section => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <h2 id={`${section.id}-heading`} className="text-xl font-bold">{section.title}</h2>
              <div className="mt-6 space-y-6">
                {section.items.map((item, index) => (
                  <div key={index}>
                    {item.question && <h3 className="mb-2 font-semibold">{item.question}</h3>}
                    {item.answer && <p className="leading-7 text-slate-600">{item.answer}</p>}
                    {"bullets" in item && item.bullets && <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-600">{item.bullets.map(text => <li key={text}>{text}</li>)}</ul>}
                    {"steps" in item && item.steps && <ol className="mt-3 list-decimal space-y-2 pl-6 leading-7 text-slate-600">{item.steps.map(text => <li key={text}>{text}</li>)}</ol>}
                  </div>
                ))}
              </div>
            </section>
          ))}
          <section id="contact" className="scroll-mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-6 sm:p-8">
            <h2 className="text-xl font-bold">Contact support</h2>
            <p className="mt-4 leading-7 text-slate-600">If your issue isn't covered above, reach out to:</p>
            <ul className="mt-3 list-disc space-y-3 pl-6 leading-7 text-slate-700">
              <li>Your City Administrator (for account, access, or ward-mapping issues)</li>
              <li>Technical Support: <a href="mailto:it@apricitydigital.in" className="break-words font-semibold text-blue-800 underline underline-offset-4">it@apricitydigital.in</a></li>
            </ul>
          </section>
        </div>
        <footer className="mt-10 flex flex-wrap gap-6 text-sm text-slate-600">
          <Link href="/privacy-policy" className="hover:underline">Privacy Policy</Link>
          <Link href="/terms-and-conditions" className="hover:underline">Terms & Conditions</Link>
        </footer>
      </main>
    </div>
  );
}
