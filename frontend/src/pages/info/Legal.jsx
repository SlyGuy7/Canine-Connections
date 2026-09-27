// Privacy policy and terms of use, written to match what the site actually does.
import React from "react"
import { Link } from "react-router-dom"
import PublicLayout from "../../site/PublicLayout"
import PageHero from "../../site/PageHero"

const UPDATED = "September 2026"

export function Privacy() {
  return (
    <PublicLayout>
      <PageHero title="Privacy policy" lead={`Last updated ${UPDATED}`} />
      <section className="s-section">
        <div className="s-container s-container--narrow s-prose">
          <p>This policy explains what information Canine Connections collects, why, and how it is protected.</p>

          <h2>What we collect</h2>
          <ul>
            <li><strong>Account details</strong> — your name, email address, phone number and address.</li>
            <li><strong>Identity documents</strong> — two forms of photo ID uploaded when you register, required by partner shelters to verify adopters.</li>
            <li><strong>Adoption activity</strong> — applications, saved dogs, quiz answers, journal entries and messages with shelters.</li>
            <li><strong>Security information</strong> — your IP address when you log in, used to prevent password-guessing attacks.</li>
          </ul>

          <h2>How we use it</h2>
          <ul>
            <li>To run your account and send you emails about it (verification, password resets, application updates and, if you turn them on, login alerts).</li>
            <li>To share your application with the shelter caring for the dog you applied for, and to let partner shelters verify adopters' identity.</li>
            <li>To suggest dogs that match your quiz answers.</li>
          </ul>
          <p>We do not sell your information or use it for advertising.</p>

          <h2>How we protect it</h2>
          <ul>
            <li>Your name, phone number and address are stored encrypted, and passwords are stored only as secure hashes.</li>
            <li>All traffic is encrypted in transit (HTTPS).</li>
            <li>Only you, and the shelters you apply to, can see your applications and messages.</li>
          </ul>

          <h2>Your choices</h2>
          <p>You can update your details or turn login alerts on and off in <Link to="/settings">Settings</Link>, and you can delete your account there at any time. Deleting your account removes your profile, applications, messages, journal and saved dogs.</p>

          <h2>Contact</h2>
          <p>Questions about this policy? <Link to="/contact">Contact us</Link>.</p>
        </div>
      </section>
    </PublicLayout>
  )
}

export function Terms() {
  return (
    <PublicLayout>
      <PageHero title="Terms of use" lead={`Last updated ${UPDATED}`} />
      <section className="s-section">
        <div className="s-container s-container--narrow s-prose">
          <p>By using Canine Connections you agree to these terms.</p>

          <h2>What we do — and don't</h2>
          <p>Canine Connections lists dogs on behalf of independent partner shelters and passes your applications to them. Each shelter decides who adopts its dogs, sets any adoption fee, and is responsible for the dogs in its care and the accuracy of its listings.</p>

          <h2>Your account</h2>
          <ul>
            <li>Give accurate information, including the identity documents you upload.</li>
            <li>Keep your password private; you're responsible for activity on your account.</li>
            <li>One account per person.</li>
          </ul>

          <h2>Acceptable use</h2>
          <ul>
            <li>Don't use the site to harass shelters or other users, or to send spam.</li>
            <li>Don't try to access other people's accounts or data, or interfere with the service.</li>
            <li>Only submit success stories and photos you have the right to share.</li>
          </ul>

          <h2>Availability</h2>
          <p>We work to keep the site available and listings current, but can't guarantee either. A dog shown as available may have been adopted since the listing was last updated.</p>

          <h2>Changes</h2>
          <p>We may update these terms; the date above shows when they last changed. Continuing to use the site means you accept the updated terms.</p>

          <p>See also our <Link to="/privacy">privacy policy</Link>.</p>
        </div>
      </section>
    </PublicLayout>
  )
}
