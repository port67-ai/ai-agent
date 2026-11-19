"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Account, StudioOffer } from "@/lib/factory/model";
import { Field } from "./shared";
import { OfferPicker } from "./StudioIntake";

/**
 * New brief: starts a studio project. The offer comes first; the rest of the intake (Brand Kit, uploads, socials, themes) is filled
 * in on the Stage 1 page. Producers pick the customer account the project belongs to, as before.
 */
export default function StudioNewBrief({ busy, accounts, chooseAccount, account, onAccount, defaultEmail, onSubmit, onClassic }: {
  busy: boolean;
  accounts: Account[];
  chooseAccount: boolean;
  account: string;
  onAccount: (id: string) => void;
  defaultEmail: string;
  onSubmit: (input: { accountId?: string; studio: { offer: StudioOffer; brief: Record<string, unknown> } }) => void;
  onClassic: () => void;
}) {
  const [offer, setOffer] = useState<StudioOffer | undefined>();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!offer) return;
        const f = new FormData(e.currentTarget);
        const v = (k: string) => String(f.get(k) || "");
        onSubmit({
          ...(chooseAccount ? { accountId: account } : {}),
          studio: { offer, brief: { client: { businessName: v("businessName"), website: v("website"), approverName: v("approverName"), approverEmail: v("approverEmail") }, project: { name: v("projectName") } } },
        });
      }}
    >
      {chooseAccount && (
        <Field label="Customer account *">
          <select name="accountId" required value={account} onChange={(e) => onAccount(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.email || a.id}</option>)}
          </select>
          <small>The project is created inside this customer&apos;s account. A new customer signs in once to create their account; it then appears here.</small>
        </Field>
      )}
      <fieldset className="f-new-offer">
        <legend>Offer *</legend>
        <OfferPicker value={offer} onChange={setOffer} disabled={busy} />
        {!offer && <small className="f-small">Choose one of the two live offers to continue.</small>}
      </fieldset>
      <div className="f-form-grid">
        <Field label="Business name *"><input name="businessName" required maxLength={120} /></Field>
        <Field label="Project name"><input name="projectName" maxLength={120} placeholder="Spring launch" /></Field>
        <Field label="Approver name"><input name="approverName" maxLength={120} /></Field>
        <Field label="Approver email"><input key={account} name="approverEmail" type="email" maxLength={180} defaultValue={defaultEmail} /></Field>
      </div>
      <Field label="Website"><input name="website" type="url" placeholder="https://your-business.com" /></Field>
      <p className="f-small">The project opens on Stage 1, where the Brand Kit, uploads, socials and themes are added and checked before approval.</p>
      <div className="f-gate-actions">
        <button className="f-button" disabled={busy || !offer}>Start the intake <ArrowRight size={17} /></button>
        <button type="button" className="f-button secondary" onClick={onClassic}>Use the classic campaign brief</button>
      </div>
    </form>
  );
}
