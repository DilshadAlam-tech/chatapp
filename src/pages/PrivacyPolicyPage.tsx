import { Link } from "react-router-dom";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <Link to="/" className="mb-6 inline-block text-sm text-primary hover:underline">
          Back to Squad Finder
        </Link>

        <h1 className="mb-2 font-heading text-3xl font-bold text-primary">Privacy Policy</h1>
        <p className="mb-8 text-sm text-muted-foreground">Effective date: April 5, 2026</p>

        <p className="mb-6 text-sm leading-6 text-muted-foreground">
          Thank you for using Squad Finder. This policy explains what information we collect, how we use it, and the controls available to you inside the app.
        </p>

        <div className="space-y-6 text-sm leading-6">
          <section>
            <h2 className="mb-2 font-semibold text-foreground">1. Information We Collect</h2>
            <ul className="list-disc pl-5 text-muted-foreground">
              <li>Account details such as username, email, and optional profile links.</li>
              <li>Gameplay details such as preferred game, UID, role, level, and team activity.</li>
              <li>Device and session data used to protect accounts and support app stability.</li>
              <li>In-app chat messages and invite activity required to run team discovery features.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">2. How We Use Data</h2>
            <ul className="list-disc pl-5 text-muted-foreground">
              <li>Create and manage your account.</li>
              <li>Match you with relevant players and squads.</li>
              <li>Power notifications, team invites, and chat history.</li>
              <li>Detect abuse, duplicate accounts, and suspicious behavior.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">3. Third-Party Services</h2>
            <p className="text-muted-foreground">
              Squad Finder may use services such as Firebase for authentication, storage, analytics, or future realtime features. Those providers handle data according to their own policies.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">4. Data Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell personal information. Data may only be shared when required by law or when necessary to protect users, prevent fraud, or maintain platform safety.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">5. Data Retention and Security</h2>
            <p className="text-muted-foreground">
              We use reasonable safeguards to protect account and communication data. No internet system is completely secure, so users should avoid sharing sensitive personal information in chat.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">6. Your Choices</h2>
            <ul className="list-disc pl-5 text-muted-foreground">
              <li>You can update profile details from your profile page.</li>
              <li>You can block or report players directly from their profile.</li>
              <li>You can contact us for privacy-related concerns or deletion requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">7. Contact</h2>
            <p className="text-muted-foreground">For support or privacy requests, email: trendingshopindia@gmail.com</p>
          </section>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">By using Squad Finder, you agree to this privacy policy.</p>
      </div>
    </div>
  );
}
